import yfinance as yf
from typing import List, Dict
import pandas as pd

def get_current_prices(tickers: List[str]) -> Dict[str, float]:
    """Busca os preços atuais de uma lista de tickers (B3)."""
    prices = {}
    for ticker in tickers:
        try:
            # Adiciona .SA se não tiver (padrão Yahoo Finance para B3)
            formatted_ticker = f"{ticker.upper()}.SA" if not ticker.endswith(".SA") else ticker.upper()
            asset = yf.Ticker(formatted_ticker)
            # Tenta pegar o preço de fechamento mais recente
            data = asset.history(period="1d")
            if not data.empty:
                prices[ticker.upper()] = data['Close'].iloc[-1]
            else:
                # Fallback para info se history falhar
                prices[ticker.upper()] = asset.info.get('regularMarketPrice') or asset.info.get('previousClose') or 0.0
        except Exception as e:
            print(f"Erro ao buscar preço para {ticker}: {e}")
            prices[ticker.upper()] = 0.0
    return prices

def get_ticker_history(ticker: str, period: str = "1mo") -> List[Dict]:
    """Busca o histórico de preços de um ativo para gerar gráficos."""
    try:
        formatted_ticker = f"{ticker.upper()}.SA" if not ticker.endswith(".SA") else ticker.upper()
        asset = yf.Ticker(formatted_ticker)
        hist = asset.history(period=period)
        return hist.reset_index().to_dict(orient='records')
    except:
        return []
