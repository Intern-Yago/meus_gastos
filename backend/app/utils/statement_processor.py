import os
import uuid
import pandas as pd
from datetime import datetime
import asyncio
from sqlalchemy.orm import Session
from .. import crud, models, schemas
from ..progress_tracker import import_progress
from ..database import SessionLocal
import io

async def process_statement_logic(file_path: str, user_id: int):
    """Lógica central de importação de extrato com gerenciamento de sessão próprio."""
    db = SessionLocal()
    file_extension = os.path.splitext(file_path)[1].lower()
    
    # Mapeamento Inteligente de Palavras-Chave -> Categoria
    CATEGORY_MAPPING = {
        'Alimentação': ['PADARIA', 'SUPERMERCADO', 'IFD*', 'RESTAURANTE', 'LANCHONETE', 'CAFETERIA', 'MERCADO', 'EXTRA', 'CARREFOUR', 'ASSAI', 'PAO DE ACUCAR', 'IFOOD'],
        'Transporte': ['UBER', '99APP', 'RECARGA TRANSPORTE', 'POSTO', 'COMBUSTIVEL', 'SHELL', 'IPIRANGA', 'METRO', 'CPTM', 'LOCAL PARK'],
        'Moradia': ['ENEL', 'SABESP', 'ALUGUEL', 'CONDOMINIO', 'INTERNET', 'VIVO', 'CLARO', 'OI', 'TIM', 'CARVALHO ADMINISTRACAO'],
        'Lazer': ['STARBULLS', 'CINEMA', 'NETFLIX', 'SPOTIFY', 'BAR', 'PUB', 'EVENTO', '99 FOOD', 'EMPORIO'],
        'Saúde': ['FARMACIA', 'DROGARIA', 'HOSPITAL', 'CLINICA', 'DENTISTA', 'UNIMED', 'NOTRE DAME'],
        'Serviços Públicos': ['RECEITA FEDERAL', 'POUPATEMPO', 'TAXA', 'PREFEITURA'],
        'Educação': ['ESCOLA', 'FACULDADE', 'CURSO', 'UDEMY', 'ALURA'],
        'Vestuário': ['ZARA', 'RENNER', 'RIACHUELO', 'C&A', 'NIKE', 'ADIDAS']
    }

    try:
        if file_extension in ['.xlsx', '.xls']:
            initial_df = pd.read_excel(file_path, header=None, nrows=30)
            header_row_index = 0
            found_header = False
            for i, row in initial_df.iterrows():
                row_values = [str(v).lower() for v in row.values if pd.notna(v)]
                if any('data' in v for v in row_values) and any('valor' in v for v in row_values):
                    header_row_index = i
                    found_header = True
                    break
            df = pd.read_excel(file_path, header=header_row_index if found_header else 4)
        else:
            with open(file_path, 'r', encoding='latin-1') as f:
                first_lines = "".join([f.readline() for _ in range(10)])
                delimiter = ';' if ';' in first_lines else ','
            
            skiprows = 0
            with open(file_path, 'r', encoding='latin-1') as f:
                for i, line in enumerate(f):
                    l = line.lower()
                    if ('data' in l or 'lançamento' in l) and 'valor' in l:
                        skiprows = i
                        break
            df = pd.read_csv(file_path, sep=delimiter, skiprows=skiprows, encoding='latin-1')
            
        df.columns = [str(c).strip() for c in df.columns]
        
        col_map = {
            'Data Lançamento': ['data', 'date', 'lançamento', 'lancamento'],
            'Histórico': ['histórico', 'historico', 'hist'],
            'Descrição': ['descrição', 'descricao', 'desc', 'detalhe'],
            'Valor': ['valor', 'value', 'val', 'amt', 'amount']
        }
        
        found = {}
        for internal_key, search_terms in col_map.items():
            for col in df.columns:
                col_lower = col.lower()
                if any(term in col_lower for term in search_terms):
                    found[internal_key] = col
                    break
        
        if 'Data Lançamento' not in found or 'Valor' not in found:
            return f"Erro: Colunas não encontradas."

        total_rows = len(df)
        import_progress[user_id] = {"current": 0, "total": total_rows, "status": "processing"}
        
        # Cache de categorias para performance
        db_categories = crud.get_categories(db, user_id=user_id)
        cat_cache = {c.name.lower(): c for c in db_categories}

        def get_or_create_cat(name, c_type):
            name_lower = name.lower()
            if name_lower in cat_cache:
                return cat_cache[name_lower]
            new_cat = crud.create_category(db, schemas.CategoryCreate(name=name, type=c_type), user_id)
            cat_cache[name_lower] = new_cat
            return new_cat

        # Categorias garantidas
        cat_importado = get_or_create_cat("Importado", "expense")
        cat_rendimentos = get_or_create_cat("Investimentos", "income")
        cat_salario = get_or_create_cat("Salário", "income")

        imported_count = 0
        for index, row in df.iterrows():
            try:
                import_progress[user_id]["current"] = index + 1
                d_col, v_col = found['Data Lançamento'], found['Valor']
                val_raw = row[v_col]
                if pd.isna(row[d_col]) or pd.isna(val_raw): continue
                    
                date_str = str(row[d_col])
                try:
                    date_obj = pd.to_datetime(date_str, dayfirst=True).to_pydatetime()
                except: continue
                
                h_col, desc_col = found.get('Histórico'), found.get('Descrição')
                h_val = str(row[h_col]) if h_col and pd.notna(row[h_col]) else ""
                ds_val = str(row[desc_col]) if desc_col and pd.notna(row[desc_col]) else ""
                description = f"{h_val} {ds_val}".strip()
                desc_upper = description.upper()
                
                if isinstance(val_raw, str):
                    amount = float(val_raw.replace('.', '').replace(',', '.'))
                else:
                    amount = float(val_raw)
                
                if amount == 0: continue

                # LÓGICA DE CATEGORIZAÇÃO INTELIGENTE
                final_cat = cat_importado
                
                if amount > 0: # ENTRADAS
                    if any(x in desc_upper for x in ["RENDIMENTO", "MXRF", "DIVIDENDO", "B3", "EVENTO B3"]):
                        final_cat = cat_rendimentos
                    elif any(x in desc_upper for x in ["SALARIO", "VENCIMENTO", "EAATA", "FOLHA"]):
                        final_cat = cat_salario
                    else:
                        final_cat = get_or_create_cat("Outras Receitas", "income")
                else: # SAÍDAS
                    matched = False
                    for cat_name, keywords in CATEGORY_MAPPING.items():
                        if any(k in desc_upper for k in keywords):
                            final_cat = get_or_create_cat(cat_name, "expense")
                            matched = True
                            break
                    if not matched:
                        final_cat = cat_importado

                new_tx_model = models.Transaction(
                    amount=abs(amount),
                    description=description or "Importação",
                    category_id=final_cat.id,
                    date=date_obj,
                    is_fixed_expense=False,
                    payment_method=models.PaymentMethod.PIX if "PIX" in desc_upper else models.PaymentMethod.OTHERS,
                    user_id=user_id
                )
                db.add(new_tx_model)
                imported_count += 1
                if total_rows < 100: await asyncio.sleep(0.01)
            except: continue
        
        db.commit()
        import_progress[user_id]["status"] = "completed"
        return f"Sucesso: {imported_count} transações importadas e categorizadas."
    except Exception as e:
        import_progress[user_id]["status"] = "idle"
        print(f"DEBUG Error in background task: {e}")
        return f"Erro no processamento: {str(e)}"
    finally:
        db.close() # GARANTIR FECHAMENTO
        if os.path.exists(file_path) and ("temp_" in file_path or "tmp_" in file_path):
            os.remove(file_path)
