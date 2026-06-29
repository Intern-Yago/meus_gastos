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

async def get_active_whatsapp_instance():
    """Busca dinamicamente na Evolution API qual instância está 'open' para uso."""
    import os
    import httpx
    
    evolution_url = os.getenv("EVOLUTION_API_URL", "http://evolution:8080")
    global_api_key = os.getenv("AUTHENTICATION_API_KEY", "finora_secret_key_whatsapp")
    
    headers = {
        "apikey": global_api_key,
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(f"{evolution_url}/instance/fetchInstances", headers=headers)
            if res.status_code == 200:
                instances = res.json()
                for inst_wrapper in instances:
                    inst = inst_wrapper.get("instance", {})
                    if inst.get("status") == "open":
                        name = inst.get("instanceName")
                        token = inst.get("apikey") or inst.get("integration", {}).get("token") or global_api_key
                        return name, token
        except Exception as e:
            print(f"Erro ao buscar instâncias dinamicamente: {e}")
            
    return "finora_main", global_api_key

async def get_media_base64(message_data: dict):
    """Solicita o base64 da mídia para a Evolution API."""
    instance_name, apikey = await get_active_whatsapp_instance()
    url = f"{EVOLUTION_API_URL}/chat/getBase64FromMediaMessage/{instance_name}"
    headers = {"apikey": apikey, "Content-Type": "application/json"}
    
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

@router.get("/bot-info")
async def get_bot_info():
    """Retorna as informações do bot de WhatsApp ativo (número e nome)."""
    try:
        instance_name, apikey = await get_active_whatsapp_instance()
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{EVOLUTION_API_URL}/instance/fetchInstances", headers={"apikey": EVOLUTION_API_KEY})
            if res.status_code == 200:
                for inst_wrapper in res.json():
                    inst = inst_wrapper.get("instance", {})
                    if inst.get("instanceName") == instance_name:
                        owner_jid = inst.get("owner")
                        number = owner_jid.split("@")[0] if owner_jid else ""
                        profile_name = inst.get("profileName", "Finora Bot")
                        return {
                            "number": number,
                            "profile_name": profile_name,
                            "instance_name": instance_name
                        }
    except Exception as e:
        print(f"Erro ao buscar informações do bot: {e}")
        
    return {
        "number": "556193774923",
        "profile_name": "Finora Bot",
        "instance_name": "celular"
    }

@router.post("/webhook")
async def whatsapp_webhook(request: Request, db: Session = Depends(database.get_db)):
    """Recebe mensagens do WhatsApp e processa verificações, áudios, imagens ou documentos."""
    # Validação de autenticidade flexível e dinâmica do webhook com logging diagnóstico
    headers_dict = dict(request.headers)
    received_key = request.headers.get("apikey") or request.headers.get("x-api-key")
    
    print(f"--- WEBHOOK RECEIVED ---")
    print(f"apikey in headers: {received_key}")
    print(f"All headers received: {headers_dict}")
    print(f"Master EVOLUTION_API_KEY: {EVOLUTION_API_KEY}")
    
    # 1. Tenta ler o JSON primeiro para validar dinamicamente via Instância Ativa
    try:
        data = await request.json()
    except Exception:
        data = {}
        
    instance_in_payload = data.get("instance")
    print(f"Instance in payload: {instance_in_payload}")
    
    # Busca a instância ativa configurada no nosso sistema
    active_instance, _ = await get_active_whatsapp_instance()
    
    is_valid = False
    
    # Se recebemos um token nos headers, validamos rigorosamente
    if received_key:
        is_valid = (received_key == EVOLUTION_API_KEY)
        if not is_valid:
            try:
                # Valida contra tokens das instâncias cadastradas dinamicamente
                async with httpx.AsyncClient() as client:
                    res = await client.get(f"{EVOLUTION_API_URL}/instance/fetchInstances", headers={"apikey": EVOLUTION_API_KEY})
                    if res.status_code == 200:
                        for inst_wrapper in res.json():
                            inst = inst_wrapper.get("instance", {})
                            token = inst.get("apikey") or inst.get("integration", {}).get("token")
                            print(f"Comparando received_key com token da instância '{inst.get('instanceName')}': {token}")
                            if token == received_key:
                                is_valid = True
                                print("Chave válida! Autenticada via token de instância.")
                                break
            except Exception as err:
                print(f"Erro ao validar apiKey do webhook dinamicamente: {err}")
    else:
        # Se NÃO recebemos nenhuma chave nos headers, mas o payload é da nossa instância cadastrada:
        # Validamos se a chamada pertence ao nosso bot ativo (segurança contra webhooks fantasmas)
        if instance_in_payload and instance_in_payload == active_instance:
            is_valid = True
            print(f"Chamada autorizada por pertencer à nossa instância ativa cadastrada: '{active_instance}'!")
            
    if not is_valid:
        print(f"Erro: Acesso não autorizado para a instância '{instance_in_payload}' ou apikey '{received_key}' inválida.")
        raise HTTPException(status_code=401, detail="Webhook não autorizado")

    try:
        data = await request.json()
        event = data.get("event")
        if event != "messages.upsert": return {"status": "event_ignored"}

        msg_wrapper = data.get("data", {})
        msg_obj = msg_wrapper.get("message", {})
        key = msg_wrapper.get("key", {})
        remote_jid = key.get("remoteJid")
        is_from_me = key.get("fromMe", False)
        source = msg_wrapper.get("source", "unknown")
        
        # O remetente real da mensagem recebida:
        # Se a mensagem NÃO foi enviada por nós (fromMe é False), o remetente real é o remote_jid (o contato que nos enviou).
        # Se foi enviada por nós (fromMe é True), o remetente é o dono da instância (data["sender"] ou remote_jid).
        if not is_from_me:
            owner_jid = remote_jid
        else:
            owner_jid = data.get("sender") or remote_jid
        
        if not remote_jid or not owner_jid: return {"status": "invalid_jid"}

        # 1. Identificar Usuário
        owner_id = owner_jid.split("@")[0]
        user = db.query(models.User).filter(models.User.phone.contains(owner_id[-8:])).first()
        if not user:
            # Fallback seguro: busca pelo whatsapp_lid cadastrado no banco de dados (ex: @lid)
            user = db.query(models.User).filter(models.User.whatsapp_lid == owner_id).first()

        # Dispara animação de digitando... em segundo plano imediatamente para remover a latência percebida (UX instantâneo)
        if user:
            asyncio.create_task(send_typing_presence(owner_jid))

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
                
                # Se não houver legenda, pedimos para a IA ser autônoma de forma segura
                instruction = user_caption if user_caption else (
                    "O usuário enviou uma imagem sem legenda. "
                    "Por favor, ANALISE esta imagem. Se ela for de fato um comprovante de pagamento, recibo, extrato, boleto ou nota fiscal, "
                    "extraia o valor, a data e a descrição, e REGISTRE a transação usando 'register_transaction_tool'. "
                    "Caso contrário, se for apenas um print de conversa de texto, foto comum ou imagem sem relação com uma despesa/receita, "
                    "você NÃO deve registrar nada. Apenas responda ou comente educadamente sobre o conteúdo da imagem."
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
                if token_user:
                    token_user.phone_verified = True
                    token_user.whatsapp_lid = remote_jid.split("@")[0]
                    db.delete(db_token); db.commit()
                    await send_whatsapp_message(owner_jid, "✅ Verificação Concluída! Seu WhatsApp agora é uma extensão oficial do seu Silo de Inteligência. 🛡️")
                    return {"status": "verified"}
                else:
                    return {"status": "ignored_suspicious_token"}
            return {"status": "token_not_found"}

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

async def send_typing_presence(remote_jid: str, presence: str = "composing"):
    """Dispara o status de 'digitando...' imediatamente de forma rápida e não-bloqueante."""
    try:
        instance_name, apikey = await get_active_whatsapp_instance()
        headers = {"apikey": apikey, "Content-Type": "application/json"}
        number_clean = remote_jid.split("@")[0] if "@" in remote_jid else remote_jid
        
        presence_url = f"{EVOLUTION_API_URL}/chat/sendPresence/{instance_name}"
        presence_payload = {
            "number": number_clean,
            # v2 fields:
            "presence": presence,
            "delay": 5000,
            # v1 fields:
            "options": {
                "delay": 5000,
                "presence": presence
            }
        }
        async with httpx.AsyncClient() as client:
            await client.post(presence_url, json=presence_payload, headers=headers)
    except Exception as e:
        print(f"ERROR SEND TYPING PRESENCE PRECOCE: {e}")

async def send_whatsapp_message(remote_jid: str, text: str):
    """Envia uma mensagem de volta via Evolution API de forma instantânea."""
    instance_name, apikey = await get_active_whatsapp_instance()
    headers = {"apikey": apikey, "Content-Type": "application/json"}
    number_clean = remote_jid.split("@")[0] if "@" in remote_jid else remote_jid
    
    # Envia a mensagem de texto real
    send_url = f"{EVOLUTION_API_URL}/message/sendText/{instance_name}"
    payload = {
        "number": remote_jid,
        # v2 fields:
        "text": text,
        "delay": 200,
        # v1 fields:
        "textMessage": {
            "text": text
        }
    }
    
    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(send_url, json=payload, headers=headers)
            if res.status_code >= 400 and "@" in remote_jid:
                payload["number"] = number_clean
                await client.post(send_url, json=payload, headers=headers)
        except Exception as e: 
            print(f"ERROR WPP SEND TEXT INSTANT FAILED: {e}")

async def auto_register_whatsapp_webhook():
    """Configura o webhook automaticamente em todas as instâncias cadastradas na Evolution API."""
    import os
    import httpx
    
    evolution_url = os.getenv("EVOLUTION_API_URL", "http://evolution:8080")
    global_api_key = os.getenv("AUTHENTICATION_API_KEY", "finora_secret_key_whatsapp")
    
    headers = {
        "apikey": global_api_key,
        "Content-Type": "application/json"
    }
    
    my_webhook_url = os.getenv("WEBHOOK_URL", "http://finora-traefik/whatsapp/webhook")
    
    async with httpx.AsyncClient() as client:
        try:
            # Aguarda a Evolution API estar online
            import asyncio
            for _ in range(10):
                try:
                    state_res = await client.get(f"{evolution_url}/instance/fetchInstances", headers=headers)
                    if state_res.status_code == 200:
                        break
                except Exception:
                    pass
                await asyncio.sleep(3)

            # Busca instâncias
            res = await client.get(f"{evolution_url}/instance/fetchInstances", headers=headers)
            if res.status_code == 200:
                instances = res.json()
                for inst_wrapper in instances:
                    inst = inst_wrapper.get("instance", {})
                    instance_name = inst.get("instanceName")
                    apikey = inst.get("apikey") or inst.get("integration", {}).get("token") or global_api_key
                    
                    # Registra webhook para cada instância cadastrada (esteja ela aberta ou conectando)
                    set_webhook_url = f"{EVOLUTION_API_URL}/webhook/set/{instance_name}"
                    webhook_payload = {
                        "enabled": True,
                        "url": my_webhook_url,
                        "events": [
                            "MESSAGES_UPSERT"
                        ],
                        "byMe": True,
                        "webhook_by_me": True,
                        # v2 support (nested)
                        "webhook": {
                            "enabled": True,
                            "url": my_webhook_url,
                            "events": [
                                "MESSAGES_UPSERT"
                            ],
                            "byMe": True
                        }
                    }
                    inst_headers = {"apikey": apikey, "Content-Type": "application/json"}
                    w_res = await client.post(set_webhook_url, json=webhook_payload, headers=inst_headers)
                    if w_res.status_code in [200, 201]:
                        print(f"Webhook do WhatsApp registrado com sucesso para a instância '{instance_name}': {my_webhook_url}")
                    else:
                        print(f"Aviso ao registrar webhook para '{instance_name}' (Status {w_res.status_code}): {w_res.text}")

                    # Configura as propriedades de comportamento (behavior settings) suportando v1 e v2
                    set_settings_url = f"{EVOLUTION_API_URL}/settings/set/{instance_name}"
                    settings_payload = {
                        # v1 settings
                        "reject_call": False,
                        "groups_ignore": True,
                        "always_online": False,
                        "read_messages": True,
                        "read_status": False,
                        "sync_full_history": False,
                        "webhook_by_me": True,
                        # v2 settings (camelCase)
                        "rejectCall": False,
                        "groupsIgnore": True,
                        "alwaysOnline": False,
                        "readMessages": True,
                        "readStatus": False,
                        "syncFullHistory": False,
                        "webhookByMe": True
                    }
                    s_res = await client.post(set_settings_url, json=settings_payload, headers=inst_headers)
                    if s_res.status_code in [200, 201]:
                        print(f"Comportamento 'webhook_by_me' ativado com sucesso para '{instance_name}'!")
                    else:
                        print(f"Aviso ao configurar comportamento para '{instance_name}' (Status {s_res.status_code}): {s_res.text}")
        except Exception as e:
            print(f"Erro na rotina de auto_register_whatsapp_webhook: {e}")
