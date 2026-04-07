"""
Return Attribution
Decompose stock returns into factor-explained and idiosyncratic components.
"""
import numpy as np
import pandas as pd

from universe import FACTOR_NAMES


def decompose_return(
    stock_returns: pd.Series,
    factor_returns: pd.DataFrame,
    betas: dict,
    period_start: str | None = None,
    period_end: str | None = None,
) -> dict:
    """
    Decompose stock total return over a period into factor contributions.

    Returns dict with:
        total_return, factor contributions dict, idiosyncratic, r_squared
    """
    if period_start:
        stock_returns = stock_returns.loc[period_start:]
        factor_returns = factor_returns.loc[period_start:]
    if period_end:
        stock_returns = stock_returns.loc[:period_end]
        factor_returns = factor_returns.loc[:period_end]

    # Align
    aligned = pd.DataFrame({"stock": stock_returns}).join(factor_returns, how="inner").dropna()
    if aligned.empty:
        return {"total_return": 0, "contributions": {}, "idiosyncratic": 0, "r_squared": 0}

    # Compound total return
    total_return = (1 + aligned["stock"]).prod() - 1

    # Factor contributions: sum(beta_k * cumulative factor return_k)
    contributions = {}
    factor_explained = 0.0
    for factor in FACTOR_NAMES:
        if factor in betas and factor in aligned.columns:
            factor_cum_ret = (1 + aligned[factor]).prod() - 1
            contrib = betas[factor] * factor_cum_ret
            contributions[factor] = round(contrib, 6)
            factor_explained += contrib
        else:
            contributions[factor] = 0.0

    idiosyncratic = total_return - factor_explained

    # R-squared from daily regression
    y = aligned["stock"].values
    X_cols = [c for c in FACTOR_NAMES if c in aligned.columns]
    if X_cols:
        X = aligned[X_cols].values
        X_aug = np.column_stack([np.ones(len(y)), X])
        try:
            coeffs = np.linalg.lstsq(X_aug, y, rcond=None)[0]
            y_hat = X_aug @ coeffs
            ss_res = np.sum((y - y_hat) ** 2)
            ss_tot = np.sum((y - y.mean()) ** 2)
            r_squared = 1 - ss_res / ss_tot if ss_tot > 1e-10 else 0
        except Exception:
            r_squared = 0
    else:
        r_squared = 0

    return {
        "total_return": round(total_return, 6),
        "contributions": contributions,
        "idiosyncratic": round(idiosyncratic, 6),
        "r_squared": round(r_squared, 4),
    }


def rolling_attribution(
    stock_returns: pd.Series,
    factor_returns: pd.DataFrame,
    betas: dict,
    window: int = 60,
) -> pd.DataFrame:
    """
    Compute rolling daily factor contributions as a DataFrame for stacked area charts.
    """
    aligned = pd.DataFrame({"stock": stock_returns}).join(factor_returns, how="inner").dropna()
    if aligned.empty:
        return pd.DataFrame()

    # Daily factor contribution = beta_k * factor_return_k
    result = pd.DataFrame(index=aligned.index)
    for factor in FACTOR_NAMES:
        if factor in betas and factor in aligned.columns:
            result[factor] = betas[factor] * aligned[factor]
        else:
            result[factor] = 0.0

    # Idiosyncratic = stock return - sum(factor contributions)
    result["Idiosyncratic"] = aligned["stock"] - result[FACTOR_NAMES].sum(axis=1)

    # Rolling sum for smoother visualization
    result = result.rolling(window, min_periods=1).mean()

    return result


def compute_r_squared(
    stock_returns: pd.Series,
    factor_returns: pd.DataFrame,
) -> float:
    """Compute R-squared of factor model for a stock."""
    aligned = pd.DataFrame({"stock": stock_returns}).join(factor_returns, how="inner").dropna()
    if len(aligned) < 30:
        return 0.0

    y = aligned["stock"].values
    X_cols = [c for c in FACTOR_NAMES if c in aligned.columns]
    if not X_cols:
        return 0.0

    X = aligned[X_cols].values
    X_aug = np.column_stack([np.ones(len(y)), X])
    try:
        coeffs = np.linalg.lstsq(X_aug, y, rcond=None)[0]
        y_hat = X_aug @ coeffs
        ss_res = np.sum((y - y_hat) ** 2)
        ss_tot = np.sum((y - y.mean()) ** 2)
        return round(1 - ss_res / ss_tot, 4) if ss_tot > 1e-10 else 0.0
    except Exception:
        return 0.0
