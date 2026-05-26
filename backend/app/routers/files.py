from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from .. import crud, schemas, models, database
from ..auth.router import get_current_user
import os
import uuid
import pandas as pd
from datetime import datetime
import shutil
import magic

router = APIRouter()

UPLOAD_DIR = "uploads"
ALLOWED_EXTENSIONS = {'.xlsx', '.xls', '.csv', '.pdf', '.png', '.jpg', '.jpeg'}
ALLOWED_MIME_TYPES = {
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', # xlsx
    'application/vnd.ms-excel', # xls
    'text/csv',
    'application/pdf',
    'image/png',
    'image/jpeg',
    'text/plain' # CSV can sometimes be detected as plain text
}

def validate_file_safety(file: UploadFile, allowed_exts=ALLOWED_EXTENSIONS):
    # 1. Check extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"Extensão {ext} não permitida.")

    # 2. Check Magic MIME type (Content validation)
    # We read a small chunk to identify the file
    content = file.file.read(2048)
    file.file.seek(0) # Reset pointer
    
    mime = magic.from_buffer(content, mime=True)
    if mime not in ALLOWED_MIME_TYPES:
        # Extra check for CSV/Text ambiguity
        if ext == '.csv' and mime in ['text/plain', 'application/csv']:
            pass
        else:
            raise HTTPException(status_code=400, detail=f"Tipo de arquivo real ({mime}) não condiz com a extensão ou não é permitido.")

from ..utils.minio_client import upload_file_to_minio, get_presigned_url

@router.post("/upload-receipt")
async def upload_receipt(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user)
):
    validate_file_safety(file)
    
    file_extension = os.path.splitext(file.filename)[1].lower()
    temp_file_name = f"temp_{uuid.uuid4()}{file_extension}"
    temp_path = os.path.join(UPLOAD_DIR, temp_file_name)
    
    # Salva temporariamente
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Sobe para o MinIO (Organizado por ID de usuário)
    object_name = f"user_{current_user.id}/{uuid.uuid4()}{file_extension}"
    minio_path = upload_file_to_minio(temp_path, object_name)
    
    # Remove o temporário
    if os.path.exists(temp_path):
        os.remove(temp_path)
        
    if not minio_path:
        raise HTTPException(status_code=500, detail="Erro ao salvar arquivo no MinIO")
        
    return {"file_path": minio_path}

from ..progress_tracker import import_progress
import asyncio

@router.get("/import-progress")
async def get_import_progress(current_user: models.User = Depends(get_current_user)):
    return import_progress.get(current_user.id, {"current": 0, "total": 0, "status": "idle"})

@router.post("/import-statement")
async def import_statement(
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(status_code=400, detail="Formato de arquivo inválido. Use Excel ou CSV.")
    
    file_extension = os.path.splitext(file.filename)[1]
    temp_file = f"temp_{uuid.uuid4()}{file_extension}"
    
    with open(temp_file, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        if file_extension in ['.xlsx', '.xls']:
            # Dynamic Header Detection (Robust)
            initial_df = pd.read_excel(temp_file, header=None, nrows=30)
            header_row_index = 0
            found_header = False
            for i, row in initial_df.iterrows():
                row_values = [str(v).lower() for v in row.values if pd.notna(v)]
                # Look for row containing both date and value keywords
                if any('data' in v for v in row_values) and any('valor' in v for v in row_values):
                    header_row_index = i
                    found_header = True
                    break
            
            # Read again using the discovered header row
            df = pd.read_excel(temp_file, header=header_row_index if found_header else 4)
        else:
            df = pd.read_csv(temp_file)
            
        df.columns = [str(c).strip() for c in df.columns]
        print(f"DEBUG: Detected columns: {list(df.columns)}")
        
        # Flexible Column Mapping
        col_map = {
            'Data Lançamento': ['data', 'date', 'lançamento', 'lancamento'],
            'Histórico': ['histórico', 'historico', 'hist'],
            'Descrição': ['descrição', 'descricao', 'desc'],
            'Valor': ['valor', 'value', 'val', 'amt', 'amount']
        }
        
        found = {}
        for internal_key, search_terms in col_map.items():
            for col in df.columns:
                col_lower = col.lower()
                if any(term in col_lower for term in search_terms):
                    found[internal_key] = col
                    break
        
        print(f"DEBUG: Found mapping: {found}")
        
        if 'Data Lançamento' not in found or 'Valor' not in found:
            cols_found = list(df.columns)
            print(f"DEBUG: Missing essential columns. Found: {found}. Columns available: {cols_found}")
            raise HTTPException(status_code=400, detail=f"Colunas essenciais (Data e Valor) não encontradas. Colunas: {cols_found}")

        total_rows = len(df)
        import_progress[current_user.id] = {"current": 0, "total": total_rows, "status": "processing"}
        
        # Get or create categories
        categories = crud.get_categories(db, user_id=current_user.id)
        imported_cat = next((c for c in categories if c.name == "Importado"), None) or \
                       crud.create_category(db, schemas.CategoryCreate(name="Importado", type="expense"), current_user.id)

        imported_count = 0
        for index, row in df.iterrows():
            try:
                import_progress[current_user.id]["current"] = index + 1
                
                d_col, v_col = found['Data Lançamento'], found['Valor']
                if pd.isna(row[d_col]) or pd.isna(row[v_col]): continue
                    
                # Robust date parsing (Day First for BR format)
                date_val = row[d_col]
                date_obj = pd.to_datetime(date_val, dayfirst=True).to_pydatetime()
                
                # Robust description
                h_col, desc_col = found.get('Histórico'), found.get('Descrição')
                h_val = str(row[h_col]) if h_col and pd.notna(row[h_col]) else ""
                ds_val = str(row[desc_col]) if desc_col and pd.notna(row[desc_col]) else ""
                description = f"{h_val} {ds_val}".strip()
                
                # Robust amount parsing
                val_raw = row[v_col]
                amount = float(str(val_raw).replace('.', '').replace(',', '.')) if isinstance(val_raw, str) else float(val_raw)
                
                new_tx_model = models.Transaction(
                    amount=abs(amount),
                    description=description or "Importação",
                    category_id=imported_cat.id if amount < 0 else next((c.id for c in categories if c.type == "income"), imported_cat.id),
                    date=date_obj,
                    is_fixed_expense=False,
                    payment_method=models.PaymentMethod.PIX if "Pix" in description.upper() else models.PaymentMethod.OTHERS,
                    user_id=current_user.id
                )
                db.add(new_tx_model)
                imported_count += 1
                
                if total_rows < 50: await asyncio.sleep(0.02)
                    
            except Exception as e:
                print(f"Error importing row {index}: {e}")
                continue
        
        db.commit()
        import_progress[current_user.id]["status"] = "completed"
        return {"message": f"Sucesso! {imported_count} transações importadas."}
    finally:
        if os.path.exists(temp_file):
            os.remove(temp_file)
        # We don't remove progress immediately so frontend can see "completed"
        # Progress will be overwritten on next import
