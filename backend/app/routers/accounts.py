from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Optional
from .. import crud, schemas, models, database
from ..auth.router import get_current_user
from datetime import datetime
import calendar
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from xml.sax.saxutils import escape as xml_escape

router = APIRouter()

def format_currency_brl(val: float) -> str:
    return f"R$ {val:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

def is_fixed_income(ticker: str) -> bool:
    t = ticker.upper()
    return any(rf in t for rf in ["CDB", "POUPANÇA", "PORQUINHO", "IPCA", "PRE", "SELIC", "TESOURO"])

@router.get("/", response_model=List[schemas.Account])
def read_accounts(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    return crud.get_accounts(db, user_id=current_user.id)

@router.post("/", response_model=schemas.Account)
def create_account(account: schemas.AccountCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    return crud.create_account(db, account=account, user_id=current_user.id)

@router.put("/{account_id}", response_model=schemas.Account)
def update_account(account_id: int, account: schemas.AccountUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    db_account = crud.update_account(db, account_id=account_id, account=account, user_id=current_user.id)
    if not db_account:
        raise HTTPException(status_code=404, detail="Account not found")
    return db_account

@router.delete("/{account_id}")
def delete_account(account_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    success = crud.delete_account(db, account_id=account_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot delete account with transactions or account not found")
    return {"message": "Account deleted"}

@router.get("/{account_id}/detailed")
def get_account_detailed(
    account_id: int,
    search: Optional[str] = None,
    payment_methods: Optional[List[str]] = Query(None),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Retorna os dados detalhados e o extrato de transações de uma conta específica com filtros flexíveis."""
    # 1. Verifica se a conta pertence ao usuário
    acc = db.query(models.Account).filter(models.Account.id == account_id, models.Account.user_id == current_user.id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")
        
    # 2. Calcula saldo líquido atualizado hoje (ignora crédito gasto)
    total_income_paid = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.account_id == account_id,
        models.Transaction.type == 'income',
        models.Transaction.is_paid == True
    ).scalar() or 0.0
    
    total_expense_paid = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.account_id == account_id,
        models.Transaction.type == 'expense',
        models.Transaction.is_paid == True,
        models.Transaction.payment_method != "CREDIT_CARD"
    ).scalar() or 0.0
    
    current_balance = (acc.initial_balance or 0.0) + total_income_paid - total_expense_paid
    
    # 3. Calcula total de crédito gasto no mês atual (caso tenha cartão de crédito ativo)
    credit_spent_current_month = 0.0
    if acc.has_credit_card:
        now_temp = datetime.now()
        credit_spent_current_month = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.user_id == current_user.id,
            models.Transaction.account_id == account_id,
            models.Transaction.type == 'expense',
            models.Transaction.payment_method == 'CREDIT_CARD',
            models.Transaction.is_paid == True,
            func.extract('month', models.Transaction.date) == now_temp.month,
            func.extract('year', models.Transaction.date) == now_temp.year
        ).scalar() or 0.0

    # 4. Constrói query de transações com filtros
    query = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.account_id == account_id
    )
    
    if search:
        query = query.filter(models.Transaction.description.ilike(f"%{search}%"))
        
    if payment_methods:
        # PostgreSQL aceita strings como enums em cláusulas in_
        query = query.filter(models.Transaction.payment_method.in_(payment_methods))
        
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            if end_date:
                end_dt = datetime.strptime(end_date, "%Y-%m-%d")
                end_dt = datetime(end_dt.year, end_dt.month, end_dt.day, 23, 59, 59)
                query = query.filter(models.Transaction.date.between(start_dt, end_dt))
            else:
                end_dt = datetime(start_dt.year, start_dt.month, start_dt.day, 23, 59, 59)
                query = query.filter(models.Transaction.date.between(start_dt, end_dt))
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de data inválido. Use YYYY-MM-DD")
            
    # Executa a busca ordenando do mais novo para o mais antigo
    transactions = query.order_by(models.Transaction.date.desc()).all()
    
    # Formata a lista de transações para o frontend
    formatted_transactions = []
    for t in transactions:
        formatted_transactions.append({
            "id": t.id,
            "date": t.date.strftime("%Y-%m-%d"),
            "description": t.description,
            "type": t.type,
            "payment_method": t.payment_method.value if hasattr(t.payment_method, "value") else str(t.payment_method),
            "amount": t.amount,
            "is_paid": t.is_paid
        })
        
    return {
        "account": {
            "id": acc.id,
            "name": acc.name,
            "color": acc.color,
            "initial_balance": acc.initial_balance,
            "has_credit_card": acc.has_credit_card,
            "credit_limit": acc.credit_limit,
            "closing_day": acc.closing_day,
            "due_day": acc.due_day
        },
        "balance": round(current_balance, 2),
        "credit_spent": round(credit_spent_current_month, 2),
        "credit_available": round((acc.credit_limit or 0.0) - credit_spent_current_month, 2) if acc.has_credit_card else 0.0,
        "transactions": formatted_transactions
    }

@router.get("/{account_id}/pdf")
def get_account_pdf(
    account_id: int,
    search: Optional[str] = None,
    payment_methods: Optional[List[str]] = Query(None),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Gera um PDF executivo de extrato bancário para a conta informada de acordo com os filtros ativos."""
    # 1. Busca os detalhes da conta
    details = get_account_detailed(
        account_id=account_id,
        search=search,
        payment_methods=payment_methods,
        start_date=start_date,
        end_date=end_date,
        db=db,
        current_user=current_user
    )
    
    acc = details["account"]
    transactions = details["transactions"]
    
    # 2. Inicia geração do PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    elements = []
    styles = getSampleStyleSheet()
    
    safe_user_name = xml_escape(current_user.name)
    safe_acc_name = xml_escape(acc["name"])
    
    # Título do Extrato
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=24, textColor=colors.HexColor("#0f172a"), alignment=0, spaceAfter=4)
    elements.append(Paragraph("Finora - Extrato de Conta", title_style))
    elements.append(Paragraph(f"Silo Financeiro de {safe_user_name}", ParagraphStyle('Sub', fontSize=10, textColor=colors.gray, spaceAfter=20)))
    
    # Ficha de Dados da Conta (Bloco Corporativo)
    summary_data = [
        [Paragraph(f"<b>Conta:</b> {safe_acc_name}", styles['Normal']), Paragraph(f"<b>Saldo Líquido Atual:</b> {format_currency_brl(details['balance'])}", styles['Normal'])],
    ]
    if acc["has_credit_card"]:
        summary_data.append([
            Paragraph(f"<b>Cartão de Crédito:</b> Ativo (Limite: {format_currency_brl(acc['credit_limit'])})", styles['Normal']),
            Paragraph(f"<b>Crédito Gasto (Mês Atual):</b> {format_currency_brl(details['credit_spent'])}", styles['Normal'])
        ])
        summary_data.append([
            Paragraph(f"<b>Fechamento Fatura:</b> Dia {acc['closing_day']} | <b>Vencimento:</b> Dia {acc['due_day']}", styles['Normal']),
            Paragraph(f"<b>Limite Disponível:</b> {format_currency_brl(details['credit_available'])}", styles['Normal'])
        ])
        
    summary_table = Table(summary_data, colWidths=[260, 260])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#e2e8f0")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#f1f5f9")),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 20))
    
    # Filtros Aplicados no Cabeçalho
    filter_desc = "Filtros aplicados: "
    filters_list = []
    if search: filters_list.append(f"Busca: '{xml_escape(search)}'")
    if payment_methods: filters_list.append(f"Métodos: {', '.join(payment_methods)}")
    if start_date:
        if end_date: filters_list.append(f"Período: {datetime.strptime(start_date, '%Y-%m-%d').strftime('%d/%m/%Y')} até {datetime.strptime(end_date, '%Y-%m-%d').strftime('%d/%m/%Y')}")
        else: filters_list.append(f"Data: {datetime.strptime(start_date, '%Y-%m-%d').strftime('%d/%m/%Y')}")
    else:
        filters_list.append("Histórico Completo")
        
    filter_desc += " | ".join(filters_list)
    elements.append(Paragraph(filter_desc, ParagraphStyle('Filters', fontSize=8, textColor=colors.HexColor("#64748b"), spaceAfter=15)))
    
    # Tabela de Transações (Zebra)
    table_data = [
        [
            Paragraph("<b>Data</b>", ParagraphStyle('Th', fontSize=9, textColor=colors.white)),
            Paragraph("<b>Descrição</b>", ParagraphStyle('Th', fontSize=9, textColor=colors.white)),
            Paragraph("<b>Tipo/Forma</b>", ParagraphStyle('Th', fontSize=9, textColor=colors.white)),
            Paragraph("<b>Valor</b>", ParagraphStyle('Th', fontSize=9, textColor=colors.white, alignment=2))
        ]
    ]
    
    for i, t in enumerate(transactions):
        date_str = datetime.strptime(t["date"], "%Y-%m-%d").strftime("%d/%m/%Y")
        desc = xml_escape(t["description"])
        
        # Formata forma de pagamento
        pm = t["payment_method"]
        pm_desc = "Débito"
        if pm == "CREDIT_CARD": pm_desc = "Crédito"
        elif pm == "PIX": pm_desc = "Pix"
        elif pm == "OTHERS": pm_desc = "Outros"
        
        # Formata valor com cor (Verde para entrada, Vermelho para saída)
        val_formatted = format_currency_brl(t["amount"])
        if t["type"] == 'income':
            val_cell = Paragraph(f"<font color='green'>+ {val_formatted}</font>", ParagraphStyle('TdVal', fontSize=8, alignment=2))
            type_desc = f"Entrada / {pm_desc}"
        else:
            val_cell = Paragraph(f"<font color='red'>- {val_formatted}</font>", ParagraphStyle('TdVal', fontSize=8, alignment=2))
            type_desc = f"Saída / {pm_desc}"
            
        table_data.append([
            Paragraph(date_str, ParagraphStyle('Td', fontSize=8)),
            Paragraph(desc, ParagraphStyle('Td', fontSize=8)),
            Paragraph(type_desc, ParagraphStyle('Td', fontSize=8)),
            val_cell
        ])
        
    tx_table = Table(table_data, colWidths=[70, 240, 110, 100])
    
    # Estilo de Tabela Corporativa Zebra
    t_style = [
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")), # Cabeçalho Preto Ardósia Premium
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]
    
    # Linhas de Zebra Alternadas
    for idx in range(1, len(table_data)):
        if idx % 2 == 0:
            t_style.append(('BACKGROUND', (0, idx), (-1, idx), colors.HexColor("#f8fafc")))
        else:
            t_style.append(('BACKGROUND', (0, idx), (-1, idx), colors.white))
            
    # Linha divisória no rodapé
    t_style.append(('LINEBELOW', (0, -1), (-1, -1), 1, colors.HexColor("#cbd5e1")))
    
    tx_table.setStyle(TableStyle(t_style))
    elements.append(tx_table)
    
    # Compila PDF
    doc.build(elements)
    pdf_content = buffer.getvalue()
    buffer.close()
    
    # Retorna o arquivo PDF
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=extrato_{acc['name'].lower().replace(' ', '_')}.pdf"
        }
    )
