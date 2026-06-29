import yfinance as yf
from typing import List, Dict
import pandas as pd
import urllib.request
import json

def get_macro_indicators() -> dict:
    """Busca indicadores macroeconômicos brasileiros (Selic, CDI, IPCA) do Banco Central (BCB) com cache persistente em Redis para fallback auto-regenerativo."""
    import redis
    import os
    
    # Defaults de segurança se tudo falhar
    fallback_defaults = {
        "selic": 10.5,
        "cdi": 10.4,
        "ipca": 4.5
    }
    
    # Tenta iniciar conexão com o Redis para ler/gravar o cache de fallback
    r_client = None
    try:
        redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
        r_client = redis.from_url(redis_url, decode_responses=True)
    except Exception as re:
        print(f"DEBUG: Erro ao conectar ao Redis para macro indicators cache: {re}")

    api_success = False
    fetched_data = {}

    # Tenta buscar a Meta Selic (Série 1178) e IPCA (Série 13522)
    try:
        req_selic = urllib.request.Request(
            "https://api.bcb.gov.br/dados/serie/bcdata.sgs.1178/dados/ultimos/1?formato=json",
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        req_ipca = urllib.request.Request(
            "https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json",
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        
        # Busca Selic
        with urllib.request.urlopen(req_selic, timeout=2) as response:
            res_selic = json.loads(response.read().decode('utf-8'))
            if res_selic:
                fetched_data["selic"] = float(res_selic[0]["valor"])
                fetched_data["cdi"] = fetched_data["selic"] - 0.1
        
        # Busca IPCA
        with urllib.request.urlopen(req_ipca, timeout=2) as response:
            res_ipca = json.loads(response.read().decode('utf-8'))
            if res_ipca:
                fetched_data["ipca"] = float(res_ipca[0]["valor"])
                
        if "selic" in fetched_data and "ipca" in fetched_data:
            api_success = True
    except Exception as e:
        print(f"Erro ao buscar indicadores reais do Banco Central: {e}")

    if api_success:
        # Se a API respondeu perfeitamente, salvamos os dados novos no Redis como o novo fallback ativo!
        if r_client:
            try:
                r_client.set("macro_indicators:cache", json.dumps(fetched_data))
                print("DEBUG: Cache de fallback macroeconômico atualizado no Redis com sucesso!")
            except Exception as se:
                print(f"Erro ao salvar cache no Redis: {se}")
        return fetched_data
    else:
        # Se a API falhar, tentamos recuperar o último cache de fallback dinâmico salvo no Redis
        if r_client:
            try:
                cached = r_client.get("macro_indicators:cache")
                if cached:
                    print("DEBUG: API do Banco Central offline. Utilizando o último cache de fallback dinâmico do Redis.")
                    return json.loads(cached)
            except Exception as ge:
                print(f"Erro ao ler cache do Redis: {ge}")
        
        # Se não houver cache no Redis, usamos os defaults estáticos
        print("DEBUG: API offline e sem cache no Redis. Utilizando defaults estáticos de segurança.")
        return fallback_defaults

def get_current_prices(tickers: List[str]) -> Dict[str, float]:
    """Busca os preços atuais de uma lista de tickers (B3) com cache persistente em Redis."""
    import redis
    import os
    import json
    
    prices = {}
    r_client = None
    try:
        redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
        r_client = redis.from_url(redis_url, decode_responses=True)
    except Exception as re:
        print(f"DEBUG REDIS TICKER CACHE: Error connecting: {re}")

    for ticker in tickers:
        ticker_upper = ticker.upper()
        cache_key = f"ticker_price:{ticker_upper}"
        
        # 1. Tenta recuperar o preço do Redis
        if r_client:
            try:
                cached_val = r_client.get(cache_key)
                if cached_val is not None:
                    print(f"DEBUG REDIS TICKER CACHE: Cache HIT para {ticker_upper}: R$ {cached_val}")
                    prices[ticker_upper] = float(cached_val)
                    continue
            except Exception as ce:
                print(f"Error reading ticker cache: {ce}")
                
        # 2. Se não estiver no cache, busca no Yahoo Finance
        try:
            formatted_ticker = f"{ticker_upper}.SA" if not ticker_upper.endswith(".SA") else ticker_upper
            asset = yf.Ticker(formatted_ticker)
            data = asset.history(period="1d")
            
            price = 0.0
            if not data.empty:
                price = float(data['Close'].iloc[-1])
            else:
                price = float(asset.info.get('regularMarketPrice') or asset.info.get('previousClose') or 0.0)
                
            prices[ticker_upper] = price
            
            # 3. Salva no Redis com expiração de 5 minutos (300 segundos)
            if r_client and price > 0.0:
                try:
                    r_client.setex(cache_key, 300, str(price))
                    print(f"DEBUG REDIS TICKER CACHE: Cache SET para {ticker_upper}: R$ {price}")
                except Exception as se:
                    print(f"Error saving ticker cache: {se}")
        except Exception as e:
            print(f"Erro ao buscar preço para {ticker_upper}: {e}")
            prices[ticker_upper] = 0.0
            
    return prices

def get_ticker_history(ticker: str, period: str = "1mo") -> List[Dict]:
    """Busca o histórico de preços de um ativo com cache em Redis para otimização de performance."""
    import redis
    import os
    import json
    
    ticker_upper = ticker.upper()
    cache_key = f"ticker_history:{ticker_upper}:{period}"
    
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
                print(f"DEBUG REDIS HIST CACHE: Cache HIT para {ticker_upper}:{period}")
                return json.loads(cached_val)
        except Exception as ce:
            print(f"Error reading hist cache: {ce}")
            
    # Se não tiver no cache, busca do Yahoo Finance
    try:
        formatted_ticker = f"{ticker_upper}.SA" if not ticker_upper.endswith(".SA") else ticker_upper
        asset = yf.Ticker(formatted_ticker)
        hist = asset.history(period=period)
        
        result = []
        if not hist.empty:
            hist = hist.reset_index()
            # CONVERTE TIMESTAMP DATE PARA STRING ISO
            if 'Date' in hist.columns:
                hist['Date'] = hist['Date'].dt.strftime('%Y-%m-%d')
            result = hist.to_dict(orient='records')
            
        # Salva no Redis com expiração de 1 hora (3600 segundos) para históricos de gráficos
        if r_client and result:
            try:
                r_client.setex(cache_key, 3600, json.dumps(result))
                print(f"DEBUG REDIS HIST CACHE: Cache SET para {ticker_upper}:{period}")
            except Exception as se:
                print(f"Error saving hist cache: {se}")
                
        return result
    except Exception as e:
        print(f"Error fetching history for {ticker_upper}: {e}")
        return []

def invalidate_investments_cache(user_id: str):
    """Limpa o cache de investimentos do usuário no Redis."""
    import redis
    import os
    try:
        redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
        r_client = redis.from_url(redis_url, decode_responses=True)
        cache_key = f"investments_summary:{user_id}"
        r_client.delete(cache_key)
        print(f"DEBUG REDIS SUMMARY CACHE: Cache invalidado para {user_id}")
    except Exception as e:
        print(f"Error invalidating investments cache: {e}")
