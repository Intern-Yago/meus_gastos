from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import database, models, crud, schemas
from ..utils.statement_processor import process_statement_logic
from ..utils.document_processor import process_document
from ..utils.minio_client import upload_file_to_minio
import os
import httpx
import json
import uuid
import base64
import shutil
from datetime import datetime
from openai import OpenAI
import asyncio

router = APIRouter()

EVOLUTION_API_URL = os.getenv("EVOLUTION_API_URL", "http://evolution:8080")
EVOLUTION_API_KEY = os.getenv("AUTHENTICATION_API_KEY", "finora_secret_key_whatsapp")

def is_same_phone(p1: str, p2: str) -> bool:
    """Compara dois números de telefone ignorando o 9º dígito e prefixos."""
    if not p1 or not p2: return False
    n1 = "".join(filter(str.isdigit, p1))
    n2 = "".join(filter(str.isdigit, p2))
    return n1[-8:] == n2[-8:]

async def get_media_base64(message_data: dict):
    """Solicita o base64 da mídia para a Evolution API v1.8.2."""
    instance_name = "finora_main"
    url = f"{EVOLUTION_API_URL}/chat/getBase64FromMediaMessage/{instance_name}"
    headers = {"apikey": EVOLUTION_API_KEY, "Content-Type": "application/json"}
    
    payload = {"message": message_data}
    
    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(url, json=payload, headers=headers)
            if res.status_code in [200, 201]:
                return res.json().get("base64")
        except Exception as e:
            print(f"ERROR GET MEDIA: {e}")
    return None

async def transcribe_whatsapp_audio(base64_data: str):
    """Transcreve um áudio base64 usando OpenAI Whisper."""
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        client = OpenAI(api_key=api_key)
        if "," in base64_data: base64_data = base64_data.split(",")[1]
        temp_filename = f"temp_voice_{uuid.uuid4()}.ogg"
        with open(temp_filename, "wb") as f: f.write(base64.b64decode(base64_data))
        try:
            audio_file = open(temp_filename, "rb")
            transcript = client.audio.transcriptions.create(model="whisper-1", file=audio_file, language="pt")
            return transcript.text
        finally:
            audio_file.close()
            if os.path.exists(temp_filename): os.remove(temp_filename)
    except Exception as e: print(f"ERROR TRANSCRIBING: {e}")
    return None

@router.post("/webhook")
async def whatsapp_webhook(request: Request, db: Session = Depends(database.get_db)):
    """Recebe mensagens do WhatsApp e processa verificações, áudios, imagens ou documentos."""
    try:
        data = await request.json()
        event = data.get("event")
        if event != "messages.upsert": return {"status": "event_ignored"}

        owner_jid = data.get("sender") 
        msg_wrapper = data.get("data", {})
        msg_obj = msg_wrapper.get("message", {})
        key = msg_wrapper.get("key", {})
        remote_jid = key.get("remoteJid")
        is_from_me = key.get("fromMe", False)
        source = msg_wrapper.get("source", "unknown")
        
        if not remote_jid or not owner_jid: return {"status": "invalid_jid"}

        # 1. Identificar Usuário
        owner_id = owner_jid.split("@")[0]
        user = db.query(models.User).filter(models.User.phone.contains(owner_id[-8:])).first()

        # 2. Extrair Conteúdo
        text_content = ""
        attachment_path = None
        is_audio = "audioMessage" in msg_obj
        is_doc = "documentMessage" in msg_obj
        is_image = "imageMessage" in msg_obj
        
        # Captura legenda (caption)
        user_caption = msg_obj.get("documentMessage", {}).get("caption") or msg_obj.get("imageMessage", {}).get("caption") or ""

        # --- PROCESSAMENTO DE MÍDIA ---
        if is_audio:
            b64 = await get_media_base64(msg_wrapper)
            if b64: text_content = await transcribe_whatsapp_audio(b64)
        
        elif is_image:
            print(f"DEBUG WPP: Image detected from {owner_id}")
            b64 = await get_media_base64(msg_wrapper)
            if b64:
                # 1. Salvar imagem no MinIO como comprovante
                temp_path = f"uploads/temp_img_{uuid.uuid4()}.jpg"
                with open(temp_path, "wb") as f: f.write(base64.b64decode(b64))
                
                object_name = f"user_{user.id}/{uuid.uuid4()}.jpg"
                attachment_path = upload_file_to_minio(temp_path, object_name)
                if os.path.exists(temp_path): os.remove(temp_path)
                
                # 2. Instruir IA a processar o comprovante
                await send_whatsapp_message(owner_jid, "📸 Comprovante recebido! Vou analisar a imagem e registrar no seu Silo... ⏳")
                
                # Se não houver legenda, pedimos para a IA ser autônoma
                instruction = user_caption if user_caption else (
                    "O usuário enviou uma imagem sem legenda. "
                    "Por favor, ANALISE esta imagem de comprovante/nota fiscal. "
                    "Extraia o valor, a data, a descrição e o método de pagamento. "
                    "REGISTRE a transação agora usando 'register_transaction_tool'. "
                    "Se você não conseguir ler os dados vitais (valor/descrição), responda perguntando educadamente os detalhes."
                )

                text_content = (
                    f"ARQUIVO MULTIMÍDIA SALVO: {attachment_path}\n"
                    f"INSTRUÇÃO: {instruction}\n\n"
                    "Vincule o 'attachment_path' acima à nova transação."
                )

        elif is_doc:
            doc_msg = msg_obj["documentMessage"]
            filename = doc_msg.get("fileName", "arquivo.pdf")
            ext = os.path.splitext(filename)[1].lower()
            
            b64 = await get_media_base64(msg_wrapper)
            if b64:
                temp_path = f"uploads/temp_wpp_{uuid.uuid4()}{ext}"
                with open(temp_path, "wb") as f: f.write(base64.b64decode(b64))
                
                if ext in ['.csv', '.xlsx', '.xls']:
                    await send_whatsapp_message(owner_jid, f"Recebi seu extrato '{filename}'. Vou integrá-lo agora... ⏳")
                    res_msg = await process_statement_logic(temp_path, user.id)
                    await send_whatsapp_message(owner_jid, f"✅ {res_msg}")
                    return {"status": "processed_statement"}
                elif ext == '.pdf':
                    doc_res = process_document(temp_path)
                    if doc_res["type"] == "text":
                        await send_whatsapp_message(owner_jid, f"Processando extrato PDF '{filename}'... ⏳")
                        text_content = (
                            f"CONTEXTO DOCUMENTO PDF ({filename}):\n{doc_res['data']}\n\n"
                            f"INSTRUÇÃO ADICIONAL DO USUÁRIO: {user_caption}\n\n"
                            "Por favor, REGISTRE TODAS as transações encontradas usando a ferramenta 'register_transaction_tool'. "
                            "Siga a instrução do usuário. Use o formato YYYY-MM-DD."
                        )
                    else:
                        await send_whatsapp_message(owner_jid, "⚠️ Recebi o PDF, mas não consegui extrair o texto.")
                        return {"status": "pdf_no_text"}
            
        elif "conversation" in msg_obj:
            text_content = msg_obj["conversation"]
        elif "extendedTextMessage" in msg_obj:
            text_content = msg_obj["extendedTextMessage"].get("text", "")
        
        text_content = text_content.strip() if text_content else ""
        if not text_content and not is_audio and not is_doc and not is_image: return {"status": "no_content"}

        # --- FLUXO DE VERIFICAÇÃO ---
        if text_content.startswith("FIN-"):
            db_token = db.query(models.VerificationToken).filter(models.VerificationToken.token == text_content, models.VerificationToken.purpose == 'whatsapp', models.VerificationToken.expires_at > datetime.utcnow()).first()
            if db_token:
                token_user = db.query(models.User).filter(models.User.id == db_token.user_id).first()
                if token_user and is_same_phone(owner_id, token_user.phone):
                    token_user.phone_verified = True
                    token_user.whatsapp_lid = remote_jid.split("@")[0]
                    db.delete(db_token); db.commit()
                    await send_whatsapp_message(owner_jid, "✅ Verificação Concluída! Seu WhatsApp agora é uma extensão oficial do seu Silo de Inteligência. 🛡️")
                    return {"status": "verified"}
                else:
                    db.delete(db_token); db.commit()
            return {"status": "ignored_suspicious_token"}

        # --- FLUXO NORMAL DE IA ---
        if not user: return {"status": "user_not_found_silenced"}
        if user.name.upper() != "YAGO VICTOR GUIMARÃES" and user.name != "Yago Victor": return {"status": "dev_lock_active"}

        remote_id = remote_jid.split("@")[0]
        if not ((remote_id == owner_id) or (user.whatsapp_lid and remote_id == user.whatsapp_lid)): return {"status": "privacy_mode_active"}
        
        human_sources = ["android", "ios", "web", "desktop"]
        if is_from_me and source not in human_sources: return {"status": "ai_loop_prevented"}

        if not text_content:
            if is_audio: await send_whatsapp_message(owner_jid, "Não consegui entender o áudio.")
            return {"status": "no_text_content"}

        from .ai import chat_with_ai
        # Passamos o attachment_path se houver (vindo da imagem do WhatsApp)
        chat_input = schemas.ChatMessage(
            messages=[schemas.ChatMessageSingle(role="user", content=text_content)], 
            save_history=True,
            attachment_path=attachment_path
        )
        ai_res_obj = await chat_with_ai(chat_input=chat_input, db=db, current_user=user)
        await send_whatsapp_message(owner_jid, ai_res_obj.get("response", "Tive um problema ao processar seu pedido."))
        
    except Exception as e:
        import traceback; traceback.print_exc()
        return {"status": "error", "detail": str(e)}

    return {"status": "ok"}

async def send_whatsapp_message(remote_jid: str, text: str):
    """Envia uma mensagem de volta via Evolution API, simulando digitação humana."""
    instance_name = "finora_main" 
    headers = {"apikey": EVOLUTION_API_KEY, "Content-Type": "application/json"}
    number_clean = remote_jid.split("@")[0] if "@" in remote_jid else remote_jid
    
    # 1. Envia status de "digitando..." (composing)
    presence_url = f"{EVOLUTION_API_URL}/chat/sendPresence/{instance_name}"
    presence_payload = {
        "number": number_clean,
        "options": {
            "delay": 2000,
            "presence": "composing"
        }
    }
    
    # 2. Envia a mensagem de texto real
    send_url = f"{EVOLUTION_API_URL}/message/sendText/{instance_name}"
    payload = {"number": remote_jid, "textMessage": {"text": text}, "delay": 1200}
    
    async with httpx.AsyncClient() as client:
        try:
            # Envia status "digitando..." primeiro
            await client.post(presence_url, json=presence_payload, headers=headers)
            # Pequeno delay para simular o tempo de digitação real
            await asyncio.sleep(1.5)
            
            res = await client.post(send_url, json=payload, headers=headers)
            if res.status_code >= 400 and "@" in remote_jid:
                payload["number"] = number_clean
                presence_payload["number"] = number_clean
                await client.post(presence_url, json=presence_payload, headers=headers)
                await asyncio.sleep(1.5)
                await client.post(send_url, json=payload, headers=headers)
        except Exception as e: 
            print(f"ERROR WPP SEND/PRESENCE FAILED: {e}")
