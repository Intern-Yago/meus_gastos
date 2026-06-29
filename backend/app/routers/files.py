from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.orm import Session
from .. import crud, schemas, models, database
from ..auth.router import get_current_user_optional
from typing import Optional
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
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/pdf',
    'image/png',
    'image/jpeg',
    'text/plain'
}

from ..utils.minio_client import upload_file_to_minio, get_presigned_url

@router.get("/download")
async def download_file(
    request: Request,
    path: str,
    ticket: str = None,
    token: str = None,
    db: Session = Depends(database.get_db)
):
    from jose import jwt, JWTError
    from ..auth import security
    
    current_user = None
    
    # 1. Auth via Header ou Token na URL
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
                if current_user: print(f"DEBUG FILES: Auth via Token successful for {email}")
        except JWTError as e:
            print(f"DEBUG FILES: JWT Error: {e}")

    # 2. Fallback para COOKIE
    if not current_user:
        download_cookie = request.cookies.get("download_token")
        if download_cookie:
            try:
                payload = jwt.decode(download_cookie, security.SECRET_KEY, algorithms=[security.ALGORITHM])
                email = payload.get("sub")
                if email and payload.get("purpose") == "download":
                    current_user = crud.get_user_by_email(db, email=email)
                    if current_user: print(f"DEBUG FILES: Auth via Cookie successful for {email}")
            except JWTError: pass

    # 3. Fallback para TICKET
    if not current_user and ticket:
        print(f"DEBUG FILES: Validating ticket {ticket}")
        REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
        import redis.asyncio as aioredis
        r_async = aioredis.from_url(REDIS_URL, decode_responses=True)
        try:
            user_id_str = await r_async.get(f"sse_ticket:{ticket}")
            if user_id_str:
                from uuid import UUID
                current_user = db.query(models.User).filter(models.User.id == UUID(user_id_str)).first()
                if current_user: print(f"DEBUG FILES: Auth via Ticket successful for {current_user.email}")
        finally: await r_async.close()

    if not current_user:
        print(f"DEBUG FILES: 401 Unauthorized for path {path}. No valid credentials found.")
        raise HTTPException(status_code=401, detail="Não autorizado")

    # EVIL PATH PREVENTION: Evita ataques de Directory Traversal e Path Traversal
    if ".." in path:
        raise HTTPException(status_code=400, detail="Caminho de arquivo inválido.")

    from ..utils.minio_client import BUCKET_NAME
    # O path de entrada pode começar com o nome do bucket ou diretamente com user_ID
    clean_path = path.replace(f"{BUCKET_NAME}/", "") # Remove o prefixo do bucket se estiver presente
    
    # Validação rigorosa: O caminho final deve começar estritamente com o prefixo do usuário
    user_prefix = f"user_{current_user.id}/"
    if not clean_path.startswith(user_prefix):
        print(f"DEBUG FILES: 403 Forbidden. User {current_user.id} tried to access {path}")
        raise HTTPException(status_code=403, detail="Acesso negado.")
        
    # 4. Proxy streaming do MinIO (Resolve o erro net::ERR_NAME_NOT_RESOLVED)
    try:
        from ..utils.minio_client import s3_client
        
        # O path pode vir como 'finora/user_.../file.png' ou 'user_.../file.png'
        clean_path = path.replace(f"{BUCKET_NAME}/", "") # Remove bucket prefix if present
        
        response_s3 = s3_client.get_object(Bucket=BUCKET_NAME, Key=clean_path)
        
        from fastapi.responses import StreamingResponse
        return StreamingResponse(
            response_s3['Body'].iter_chunks(),
            media_type=response_s3.get('ContentType', 'application/octet-stream'),
            headers={
                "Content-Disposition": f"inline; filename={os.path.basename(path)}",
                "Cache-Control": "max-age=86400" # 24h cache para logos
            }
        )
    except Exception as e:
        print(f"DEBUG FILES: Error streaming from MinIO: {e}")
        raise HTTPException(status_code=404, detail="Arquivo não encontrado no Silo.")

@router.post("/upload-receipt")
async def upload_receipt(
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user_optional)
):
    if not current_user: raise HTTPException(status_code=401)
    
    file_extension = os.path.splitext(file.filename)[1].lower()
    temp_path = os.path.join(UPLOAD_DIR, f"temp_{uuid.uuid4()}{file_extension}")
    with open(temp_path, "wb") as buffer: shutil.copyfileobj(file.file, buffer)
    object_name = f"user_{current_user.id}/{uuid.uuid4()}{file_extension}"
    minio_path = upload_file_to_minio(temp_path, object_name)
    if os.path.exists(temp_path): os.remove(temp_path)
    if not minio_path: raise HTTPException(status_code=500, detail="Erro MinIO")
    return {"file_path": minio_path}

from ..progress_tracker import import_progress
import asyncio

@router.get("/import-progress")
async def get_import_progress(current_user: models.User = Depends(get_current_user_optional)):
    if not current_user: raise HTTPException(status_code=401)
    return import_progress.get(current_user.id, {"current": 0, "total": 0, "status": "idle"})

@router.post("/import-statement")
async def import_statement(
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user_optional)
):
    if not current_user: raise HTTPException(status_code=401)
    if not file.filename.lower().endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(status_code=400, detail="Formato inválido.")
    file_extension = os.path.splitext(file.filename)[1]
    temp_path = os.path.join(UPLOAD_DIR, f"temp_imp_{uuid.uuid4()}{file_extension}")
    with open(temp_path, "wb") as buffer: shutil.copyfileobj(file.file, buffer)
    try:
        if file_extension.lower() in ['.xlsx', '.xls']:
            initial_df = pd.read_excel(temp_path, header=None, nrows=30)
            header_row_index = 0
            found_header = False
            for i, row in initial_df.iterrows():
                row_values = [str(v).lower() for v in row.values if pd.notna(v)]
                if any('data' in v for v in row_values) and any('valor' in v for v in row_values):
                    header_row_index = i
                    found_header = True
                    break
            df = pd.read_excel(temp_path, header=header_row_index if found_header else 4)
        else: df = pd.read_csv(temp_path)
        df.columns = [str(c).strip() for c in df.columns]
        col_map = {'Data': ['data', 'date'], 'Desc': ['desc', 'hist'], 'Val': ['valor', 'value', 'amt']}
        found = {}
        for k, terms in col_map.items():
            for col in df.columns:
                if any(t in col.lower() for t in terms):
                    found[k] = col
                    break
        if 'Data' not in found or 'Val' not in found:
            raise HTTPException(status_code=400, detail="Colunas não encontradas.")
        
        categories = crud.get_categories(db, user_id=current_user.id)
        imported_cat = next((c for c in categories if c.name == "Importado"), None) or crud.create_category(db, schemas.CategoryCreate(name="Importado", type="expense"), current_user.id)
        
        imported_count = 0
        for index, row in df.iterrows():
            try:
                if pd.isna(row[found['Data']]) or pd.isna(row[found['Val']]): continue
                val_raw = row[found['Val']]
                amount = float(str(val_raw).replace('.', '').replace(',', '.')) if isinstance(val_raw, str) else float(val_raw)
                new_tx = models.Transaction(
                    amount=abs(amount), description=str(row.get(found.get('Desc'), "Importação")),
                    category_id=imported_cat.id if amount < 0 else next((c.id for c in categories if c.type == "income"), imported_cat.id),
                    date=pd.to_datetime(row[found['Data']], dayfirst=True).to_pydatetime(),
                    is_paid=True, user_id=current_user.id, type='expense' if amount < 0 else 'income'
                )
                db.add(new_tx)
                imported_count += 1
            except: continue
        db.commit()
        return {"message": f"Sucesso! {imported_count} transações."}
    finally:
        if os.path.exists(temp_path): os.remove(temp_path)

@router.get("/receipt/{transaction_id}")
async def get_receipt_url(
    transaction_id: int, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user_optional)
):
    if not current_user: raise HTTPException(status_code=401)
    tx = db.query(models.Transaction).filter(
        models.Transaction.id == transaction_id, 
        models.Transaction.user_id == current_user.id
    ).first()
    
    if not tx or not tx.attachment_path:
        raise HTTPException(status_code=404, detail="Comprovante não encontrado.")
    
    url = get_presigned_url(tx.attachment_path)
    return {"url": url}
