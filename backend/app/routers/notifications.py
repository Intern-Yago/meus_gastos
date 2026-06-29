from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, models, database
from ..auth.router import get_current_user
from fastapi.responses import StreamingResponse
import asyncio
import redis.asyncio as aioredis
import os
import json
import uuid

router = APIRouter()
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

@router.get("/", response_model=List[schemas.Notification])
def read_notifications(
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    ).order_by(models.Notification.created_at.desc()).limit(50).all()

@router.post("/ticket")
async def generate_sse_ticket(
    current_user: models.User = Depends(get_current_user)
):
    """Gera um ticket temporário (30s) para autenticação SSE via Query Param."""
    ticket = str(uuid.uuid4())
    # Salva no Redis: ticket -> user_id (expira em 30 segundos)
    r_async = aioredis.from_url(REDIS_URL, decode_responses=True)
    await r_async.setex(f"sse_ticket:{ticket}", 30, str(current_user.id))
    await r_async.close()
    return {"ticket": ticket}

@router.get("/stream")
async def notification_stream(
    request: Request,
    ticket: str = None,
    db: Session = Depends(database.get_db)
):
    """Canal SSE para notificações em tempo real (Push) usando Redis Pub/Sub."""
    
    # SECURITY: Autenticação via Ticket (Evita JWT na URL/Logs)
    if not ticket:
        raise HTTPException(status_code=401, detail="Ticket ausente")
    
    redis_async = aioredis.from_url(REDIS_URL, decode_responses=True)
    user_id_str = await redis_async.get(f"sse_ticket:{ticket}")
    
    if not user_id_str:
        await redis_async.close()
        raise HTTPException(status_code=401, detail="Ticket inválido ou expirado")
    
    # Consumir o ticket (One-time use)
    await redis_async.delete(f"sse_ticket:{ticket}")
    user_id = user_id_str # Mantém como string (UUID)

    async def event_generator():
        pubsub = redis_async.pubsub()
        channel = f"notifications_{user_id}"
        await pubsub.subscribe(channel)
        
        try:
            # Enviar evento de conexão estabelecida
            yield "event: connected\ndata: {\"status\": \"ok\"}\n\n"
            
            # Loop de escuta reativo
            while True:
                if await request.is_disconnected():
                    break
                
                try:
                    message = await asyncio.wait_for(pubsub.get_message(ignore_subscribe_messages=True), timeout=20.0)
                    if message and message["type"] == "message":
                        yield f"data: {message['data']}\n\n"
                except asyncio.TimeoutError:
                    # Heartbeat para manter a conexão ativa
                    yield ": keep-alive\n\n"
                    
        except Exception as e:
            print(f"SSE Error for user {user_id}: {e}")
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.close()
            await redis_async.close()

    return StreamingResponse(
        event_generator(), 
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.put("/{notification_id}/read", response_model=schemas.Notification)
def mark_notification_read(
    notification_id: int, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user)
):
    return crud.mark_notification_as_read(db, notification_id=notification_id, user_id=current_user.id)

@router.delete("/clear")
def clear_notifications(
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_user)
):
    db.query(models.Notification).filter(models.Notification.user_id == current_user.id).delete()
    db.commit()
    return {"message": "Notifications cleared"}
