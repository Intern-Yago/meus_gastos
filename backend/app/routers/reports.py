import csv
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from .. import models, database, schemas, crud
from ..auth.router import get_current_user_optional
from typing import Optional
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from io import BytesIO, StringIO
from datetime import datetime
from xml.sax.saxutils import escape as xml_escape
import os

router = APIRouter()

def format_currency_brl(val):
    return f"R$ {val:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

def sanitize_csv_value(val):
    """Prevents CSV Injection."""
    if not val or not isinstance(val, str): return val
    stripped = val.lstrip()
    if stripped.startswith(('=', '+', '-', '@', '\t', '\r', '\n')):
        return "'" + val
    return val

@router.get("/financial-summary")
async def generate_financial_report(
    request: Request,
    month: int = None, 
    year: int = None, 
    format: str = "pdf",
    ticket: str = None, 
    token: str = None,
    db: Session = Depends(database.get_db)
):
    import redis.asyncio as aioredis
    from jose import jwt, JWTError
    from ..auth import security
    
    current_user = None
    
    # 1. Tentar Auth via Header (Bearer) ou Query Param 'token'
    auth_header = request.headers.get("Authorization")
    final_token = token
    if auth_header and auth_header.startswith("Bearer "):
        final_token = auth_header.split(" ")[1]
    
    if final_token:
        try:
            payload = jwt.decode(final_token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
            email = payload.get("sub")
            if email:
                current_user = crud.get_user_by_email(db, email=email)
        except JWTError:
            pass

    # 2. Fallback para COOKIE (Especial para navegador)
    if not current_user:
        download_cookie = request.cookies.get("download_token")
        if download_cookie:
            try:
                payload = jwt.decode(download_cookie, security.SECRET_KEY, algorithms=[security.ALGORITHM])
                email = payload.get("sub")
                if email and payload.get("purpose") == "download":
                    current_user = crud.get_user_by_email(db, email=email)
            except JWTError:
                pass

    # 3. Fallback para TICKET (IA / WhatsApp / Links diretos)
    if not current_user and ticket:
        print(f"DEBUG REPORT: Validating ticket {ticket}")
        REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
        r_async = aioredis.from_url(REDIS_URL, decode_responses=True)
        try:
            user_id_str = await r_async.get(f"sse_ticket:{ticket}")
            if user_id_str:
                from uuid import UUID
                current_user = db.query(models.User).filter(models.User.id == UUID(user_id_str)).first()
                if current_user:
                    print(f"DEBUG REPORT: Ticket valid for {current_user.email}")
                    # Link dura 24h, não deletamos
            else:
                print(f"DEBUG REPORT: Ticket {ticket} not found in Redis")
        finally:
            await r_async.close()

    if not current_user:
        print("DEBUG REPORT: Unauthorized access attempt.")
        raise HTTPException(status_code=401, detail="Não autenticado")

    now = datetime.now()
    month = month or now.month
    year = year or now.year

    # 1. Coleta de Dados
    query = db.query(models.Transaction).options(
        joinedload(models.Transaction.category),
        joinedload(models.Transaction.account)
    ).filter(
        models.Transaction.user_id == current_user.id,
        func.extract('month', models.Transaction.date) == month,
        func.extract('year', models.Transaction.date) == year
    ).order_by(models.Transaction.date.asc())
    
    transactions = query.all()

    if format == "csv":
        output = StringIO()
        writer = csv.writer(output, delimiter=';')
        writer.writerow(['Data', 'Descrição', 'Categoria', 'Conta', 'Tipo', 'Valor'])
        total = 0
        for tx in transactions:
            writer.writerow([
                tx.date.strftime('%d/%m/%Y'),
                sanitize_csv_value(tx.description),
                sanitize_csv_value(tx.category.name if tx.category else 'Sem Categoria'),
                sanitize_csv_value(tx.account.name if tx.account else 'Sem Conta'),
                'Entrada' if tx.type == 'income' else 'Saída',
                f"{tx.amount:.2f}".replace('.', ',')
            ])
            if tx.type == 'income': total += tx.amount
            else: total -= tx.amount
        writer.writerow(['', '', '', '', 'SALDO TOTAL', f"{total:.2f}".replace('.', ',')])
        return Response(content=output.getvalue(), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename=relatorio_{month}_{year}.csv"})

    # 2. Geração do PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    elements = []
    styles = getSampleStyleSheet()
    safe_user_name = xml_escape(current_user.name)
    
    try:
        logo_path = "app/static/logo_fiora.png"
        if os.path.exists(logo_path):
            img = Image(logo_path, width=50, height=50)
            elements.append(img)
    except Exception as e: print(f"Erro ao carregar logo: {e}")

    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=28, textColor=colors.HexColor("#1e293b"), alignment=0)
    elements.append(Paragraph("Finora", title_style))
    elements.append(Paragraph("Seu Silo de Inteligência Financeira", ParagraphStyle('Sub', fontSize=10, textColor=colors.gray)))
    elements.append(Spacer(1, 20))
    elements.append(Paragraph(f"Relatório de Movimentações - {month:02d}/{year}", styles['Heading2']))
    elements.append(Paragraph(f"Emitido para: {safe_user_name}", styles['Normal']))
    elements.append(Paragraph(f"Data de Emissão: {datetime.now().strftime('%d/%m/%Y %H:%M')}", styles['Normal']))
    elements.append(Spacer(1, 30))

    data = [["Data", "Descrição", "Categoria", "Tipo", "Valor"]]
    total_in = 0
    total_out = 0
    for tx in transactions:
        row_type = "ENTRADA" if tx.type == 'income' else "SAÍDA"
        val_str = format_currency_brl(tx.amount)
        safe_desc = xml_escape(tx.description[:30])
        safe_cat = xml_escape((tx.category.name if tx.category else "Geral")[:15])
        data.append([tx.date.strftime('%d/%m'), safe_desc, safe_cat, row_type, val_str])
        if tx.type == 'income': total_in += tx.amount
        else: total_out += tx.amount

    t = Table(data, colWidths=[50, 180, 100, 80, 100])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (-1, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")])
    ]))
    elements.append(t)
    elements.append(Spacer(1, 20))
    elements.append(Paragraph("Consolidado Financeiro", styles['Heading3']))
    summary_data = [["Total Entradas", format_currency_brl(total_in)], ["Total Saídas", format_currency_brl(total_out)], ["SALDO LÍQUIDO", format_currency_brl(total_in - total_out)]]
    st = Table(summary_data, colWidths=[150, 100])
    st.setStyle(TableStyle([('ALIGN', (1, 0), (1, -1), 'RIGHT'), ('FONTNAME', (0, 2), (-1, 2), 'Helvetica-Bold'), ('LINEABOVE', (0, 2), (-1, 2), 1, colors.black)]))
    elements.append(st)
    doc.build(elements)
    pdf = buffer.getvalue()
    buffer.close()
    return Response(content=pdf, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=relatorio_finora_{month}_{year}.pdf"})
