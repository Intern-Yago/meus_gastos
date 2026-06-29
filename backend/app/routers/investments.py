from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from .. import crud, schemas, models, database
from ..auth.router import get_current_user
from ..utils.market_data import get_current_prices, get_ticker_history
from typing import List, Dict
import json
import redis
import os
import yfinance as yf
from datetime import datetime

router = APIRouter()

def is_fixed_income(ticker: str) -> bool:
    t = ticker.upper()
    return any(rf in t for rf in ["CDB", "POUPANÇA", "PORQUINHO", "IPCA", "PRE", "SELIC", "TESOURO"])

def get_ticker_currency(ticker_upper: str, r_client) -> str:
    """Busca a moeda padrão de um ativo (USD ou BRL) com cache persistente em Redis."""
    cache_key = f"ticker_currency:{ticker_upper}"
    if r_client:
        try:
            cached = r_client.get(cache_key)
            if cached: 
                print(f"DEBUG REDIS CURRENCY CACHE: HIT para {ticker_upper}: {cached}")
                return cached
        except:
            pass
            
    try:
        # Se for um ticker brasileiro de 5 ou 6 caracteres terminando com número, é BRL
        is_brazil = ticker_upper.endswith(".SA") or (len(ticker_upper) >= 5 and ticker_upper[-1].isdigit()) or (len(ticker_upper) == 5 and ticker_upper[-2:].isdigit())
        formatted_ticker = f"{ticker_upper}.SA" if is_brazil and not ticker_upper.endswith(".SA") else ticker_upper
        
        asset = yf.Ticker(formatted_ticker)
        currency = asset.info.get("currency", "BRL")
        
        if r_client and currency:
            try:
                r_client.set(cache_key, currency)
                print(f"DEBUG REDIS CURRENCY CACHE: SET para {ticker_upper}: {currency}")
            except:
                pass
        return currency
    except:
        return "BRL"

def get_usd_brl_rate(r_client) -> float:
    """Busca a cotação ao vivo do Dólar para Real (USD/BRL) com cache persistente em Redis por 30 minutos."""
    cache_key = "usd_brl_rate"
    if r_client:
        try:
            cached = r_client.get(cache_key)
            if cached: 
                print(f"DEBUG REDIS USD RATE CACHE: HIT: R$ {cached}")
                return float(cached)
        except:
            pass
            
    try:
        rate = float(yf.Ticker("USDBRL=X").history(period="1d")['Close'].iloc[-1])
        if r_client and rate > 0:
            try:
                r_client.setex(cache_key, 1800, str(rate)) # Cache de 30 minutos
                print(f"DEBUG REDIS USD RATE CACHE: SET: R$ {rate}")
            except:
                pass
        return rate
    except Exception as e:
        print(f"Error fetching USD/BRL live rate: {e}")
        return 5.40 # Fallback de segurança contábil

@router.get("/summary")
def get_investments_summary(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    """Retorna o resumo da carteira de investimentos do usuário com suporte multimoeda e cache em Redis."""
    cache_key = f"investments_summary:{current_user.id}"
    r_client = None
    try:
        redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
        r_client = redis.from_url(redis_url, decode_responses=True)
    except Exception as re:
        print(f"DEBUG REDIS SUMMARY CACHE: Error connecting: {re}")
        
    if r_client:
        try:
            cached_val = r_client.get(cache_key)
            if cached_val is not None:
                print(f"DEBUG REDIS SUMMARY CACHE: Cache HIT para {current_user.id}")
                return json.loads(cached_val)
        except Exception as ce:
            print(f"Error reading summary cache: {ce}")

    # Busca todas as transações que possuem ticker (identificadas como investimentos)
    txs = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.ticker != None
    ).all()
    
    if not txs:
        return []

    # Agrupa por ticker para calcular preço médio e total de cotas
    portfolio = {}
    for t in txs:
        ticker = t.ticker.upper()
        if ticker not in portfolio:
            portfolio[ticker] = {"shares": 0, "total_cost": 0, "history": []}
        
        portfolio[ticker]["shares"] += t.shares
        portfolio[ticker]["total_cost"] += t.amount
        portfolio[ticker]["history"].append({
            "date": t.date.strftime("%Y-%m-%d"),
            "shares": t.shares,
            "price_at_time": t.amount / t.shares if t.shares > 0 else 0
        })

    # Busca preços atuais via Yahoo Finance
    current_prices = get_current_prices(list(portfolio.keys()))
    
    result = []
    for ticker, data in portfolio.items():
        if data["shares"] <= 0: continue
            
        avg_price = data["total_cost"] / data["shares"]
        curr_price = current_prices.get(ticker, 0.0)
        
        # Correção Renda Fixa: se for um ativo não cotado na B3, herda o preço de compra
        if curr_price == 0.0 or is_fixed_income(ticker):
            curr_price = avg_price
            
        # --- LÓGICA DE DETECÇÃO MULTIMOEDA (Dólar / Renda Internacional) ---
        currency = get_ticker_currency(ticker, r_client)
        
        if currency == "USD":
            usd_rate = get_usd_brl_rate(r_client)
            curr_price_brl = curr_price * usd_rate
            total_value = data["shares"] * curr_price_brl
            # Note: total_cost já está registrado no banco convertido em BRL (moeda-base do livro razão)
            profit = total_value - data["total_cost"]
        else:
            total_value = data["shares"] * curr_price
            profit = total_value - data["total_cost"]
            
        profit_pct = (profit / data["total_cost"] * 100) if data["total_cost"] > 0 else 0
        
        # Lógica de Badge (Excelente, Bom, Ruim) baseada em performance simples
        status = "BOM"
        if profit_pct > 10: status = "EXCELENTE"
        elif profit_pct < -5: status = "RUIM"
        
        result.append({
            "ticker": ticker,
            "shares": data["shares"],
            "avg_price": round(avg_price, 2),
            "current_price": round(curr_price, 2),
            "total_cost": round(data["total_cost"], 2),
            "total_value": round(total_value, 2),
            "profit": round(profit, 2),
            "profit_pct": round(profit_pct, 2),
            "status": status,
            "chart_data": [] # Otimização: O histórico agora é buscado dinamicamente via /history para velocidade instantânea!
        })
        
    # Salva no Redis por 5 minutos (300 segundos) para carregamentos instantâneos
    if r_client and result:
        try:
            r_client.setex(cache_key, 300, json.dumps(result))
            print(f"DEBUG REDIS SUMMARY CACHE: Cache SET para {current_user.id}")
        except Exception as se:
            print(f"Error saving summary cache: {se}")
        
    return result

@router.get("/history")
def get_investment_history(
    ticker: str,
    period: str = "1mo",
    interval: str = "1d",
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Retorna o histórico de cotações filtrado de um ativo com suporte multimoeda e cache inteligente em Redis."""
    import redis
    import os
    import json
    
    ticker_upper = ticker.upper()
    cache_key = f"ticker_history:{ticker_upper}:{period}:{interval}"
    
    # 1. Renda Fixa: Renda fixa não possui cotação de mercado na Bolsa
    if is_fixed_income(ticker_upper):
        return []
        
    r_client = None
    try:
        redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
        r_client = redis.from_url(redis_url, decode_responses=True)
    except Exception as re:
        print(f"DEBUG REDIS HIST CACHE: Error connecting: {re}")
        
    if r_client:
        try:
            cached_val = r_client.get(cache_key)
            if cached_val is not None:
                print(f"DEBUG REDIS HIST CACHE: Cache HIT para {ticker_upper}:{period}:{interval}")
                return json.loads(cached_val)
        except Exception as ce:
            print(f"Error reading hist cache: {ce}")
            
    # 2. Busca do Yahoo Finance
    try:
        is_brazil = ticker_upper.endswith(".SA") or (len(ticker_upper) >= 5 and ticker_upper[-1].isdigit()) or (len(ticker_upper) == 5 and ticker_upper[-2:].isdigit())
        formatted_ticker = f"{ticker_upper}.SA" if is_brazil and not ticker_upper.endswith(".SA") else ticker_upper
        
        asset = yf.Ticker(formatted_ticker)
        hist = asset.history(period=period, interval=interval)
        
        result = []
        if not hist.empty:
            hist = hist.reset_index()
            # CONVERTE TIMESTAMP DATE OU DATETIME PARA STRING ISO
            date_col = 'Datetime' if 'Datetime' in hist.columns else 'Date'
            if date_col in hist.columns:
                if date_col == 'Datetime':
                    # Para dados intradiários (por hora/minuto), formatamos com hora:minuto
                    hist['Date'] = hist['Datetime'].dt.strftime('%H:%M')
                else:
                    hist['Date'] = hist['Date'].dt.strftime('%Y-%m-%d')
                    
            # --- CONVERSÃO DE GRÁFICOS MULTIMOEDA (DÓLAR EM REAIS) ---
            currency = get_ticker_currency(ticker_upper, r_client)
            if currency == "USD":
                usd_rate = get_usd_brl_rate(r_client)
                for row in hist.to_dict(orient='records'):
                    # Multiplica os valores do gráfico em dólares pelo câmbio do dia para mostrar o gráfico convertido em R$!
                    row['Close'] = round(row['Close'] * usd_rate, 2)
                    result.append(row)
            else:
                result = hist.to_dict(orient='records')
            
        # 3. Salva no Redis com cache inteligente baseado no período
        if r_client and result:
            # Se for intradiário (1d), expira em 5 minutos. Se for histórico, expira em 24 horas!
            expiration = 300 if period == "1d" else 86400
            try:
                r_client.setex(cache_key, expiration, json.dumps(result))
                print(f"DEBUG REDIS HIST CACHE: Cache SET para {ticker_upper}:{period}:{interval} (Expiração: {expiration}s)")
            except Exception as se:
                print(f"Error saving hist cache: {se}")
                
        return result
    except Exception as e:
        print(f"Error fetching history for {ticker_upper}: {e}")
        return []

@router.get("/check")
def check_has_investments(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    """Verifica se o usuário possui algum investimento cadastrado para mostrar no menu."""
    count = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.ticker != None
    ).count()
    return {"has_investments": count > 0}
