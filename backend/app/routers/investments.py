from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import crud, schemas, models, database
from ..auth.router import get_current_user
from ..utils.market_data import get_current_prices, get_ticker_history
from typing import List
import json

router = APIRouter()

@router.get("/summary")
def get_investments_summary(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    """Retorna o resumo da carteira de investimentos do usuário."""
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
        total_value = data["shares"] * curr_price
        profit = total_value - data["total_cost"]
        profit_pct = (profit / data["total_cost"] * 100) if data["total_cost"] > 0 else 0
        
        # Lógica de Badge (Excelente, Bom, Ruim) baseada em performance simples
        # (Isso pode ser evoluído com análise da IA depois)
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
            "chart_data": get_ticker_history(ticker) # Dados para o gráfico de linha
        })
        
    return result

@router.get("/check")
def check_has_investments(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    """Verifica se o usuário possui algum investimento cadastrado para mostrar no menu."""
    count = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id,
        models.Transaction.ticker != None
    ).count()
    return {"has_investments": count > 0}
