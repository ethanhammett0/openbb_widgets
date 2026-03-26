"""
Pairs Trading Engine
Cointegration testing, Kalman hedge ratios, z-scores, half-life.
"""
import logging

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


def test_cointegration(prices_a: pd.Series, prices_b: pd.Series) -> dict:
    """
    Run Engle-Granger cointegration test on log prices.
    Returns: eg_pvalue, adf_stat, adf_pvalue, cointegrated, ols_hedge_ratio
    """
    from statsmodels.tsa.stattools import adfuller

    aligned = pd.DataFrame({"A": prices_a, "B": prices_b}).dropna()
    if len(aligned) < 60:
        return {"eg_pvalue": 1.0, "adf_stat": 0.0, "adf_pvalue": 1.0, "cointegrated": False, "ols_hedge_ratio": 0.0}

    log_a = np.log(aligned["A"])
    log_b = np.log(aligned["B"])

    # Step 1: OLS regression log_a = alpha + beta * log_b + epsilon
    X = np.column_stack([np.ones(len(log_b)), log_b.values])
    try:
        coeffs = np.linalg.lstsq(X, log_a.values, rcond=None)[0]
    except Exception:
        return {"eg_pvalue": 1.0, "adf_stat": 0.0, "adf_pvalue": 1.0, "cointegrated": False, "ols_hedge_ratio": 0.0}

    residuals = log_a.values - X @ coeffs

    # Step 2: ADF test on residuals
    try:
        adf_result = adfuller(residuals, maxlag=int(np.sqrt(len(residuals))), regression="c")
        adf_stat = adf_result[0]
        adf_pvalue = adf_result[1]
    except Exception:
        adf_stat = 0.0
        adf_pvalue = 1.0

    return {
        "eg_pvalue": round(adf_pvalue, 4),
        "adf_stat": round(adf_stat, 4),
        "adf_pvalue": round(adf_pvalue, 4),
        "cointegrated": adf_pvalue < 0.05,
        "ols_hedge_ratio": round(coeffs[1], 4),
    }


def kalman_hedge_ratio(prices_a: pd.Series, prices_b: pd.Series) -> pd.DataFrame:
    """
    Kalman-filtered time-varying hedge ratio.
    Returns DataFrame with columns: hedge_ratio, intercept, spread, z_score
    """
    try:
        from pykalman import KalmanFilter
    except ImportError:
        logger.warning("pykalman not installed, using rolling OLS fallback")
        return _rolling_hedge_ratio(prices_a, prices_b)

    aligned = pd.DataFrame({"A": prices_a, "B": prices_b}).dropna()
    if len(aligned) < 60:
        return pd.DataFrame()

    log_a = np.log(aligned["A"].values)
    log_b = np.log(aligned["B"].values)
    n = len(log_a)

    # Observation matrix: [log_b, 1] for each time step
    obs_mat = np.column_stack([log_b, np.ones(n)]).reshape(n, 1, 2)

    # State: [hedge_ratio, intercept]
    kf = KalmanFilter(
        n_dim_obs=1,
        n_dim_state=2,
        transition_matrices=np.eye(2),
        observation_matrices=obs_mat,
        initial_state_mean=np.array([1.0, 0.0]),
        initial_state_covariance=np.eye(2),
        transition_covariance=np.eye(2) * 0.0001,
        observation_covariance=np.array([[0.001]]),
    )

    state_means, _ = kf.filter(log_a.reshape(-1, 1))

    result = pd.DataFrame(index=aligned.index)
    result["hedge_ratio"] = state_means[:, 0]
    result["intercept"] = state_means[:, 1]
    result["spread"] = log_a - state_means[:, 0] * log_b - state_means[:, 1]

    # Z-score with 60-day rolling window
    rolling_mean = result["spread"].rolling(60, min_periods=30).mean()
    rolling_std = result["spread"].rolling(60, min_periods=30).std()
    result["z_score"] = (result["spread"] - rolling_mean) / rolling_std.replace(0, np.nan)
    result["z_score"] = result["z_score"].fillna(0)

    return result


def _rolling_hedge_ratio(prices_a: pd.Series, prices_b: pd.Series, window: int = 60) -> pd.DataFrame:
    """Fallback: rolling OLS hedge ratio."""
    aligned = pd.DataFrame({"A": prices_a, "B": prices_b}).dropna()
    if len(aligned) < window:
        return pd.DataFrame()

    log_a = np.log(aligned["A"].values)
    log_b = np.log(aligned["B"].values)
    n = len(log_a)

    ratios = np.full(n, np.nan)
    intercepts = np.full(n, np.nan)
    for t in range(window, n):
        X = np.column_stack([np.ones(window), log_b[t - window : t]])
        y = log_a[t - window : t]
        try:
            coeffs = np.linalg.lstsq(X, y, rcond=None)[0]
            intercepts[t] = coeffs[0]
            ratios[t] = coeffs[1]
        except Exception:
            pass

    result = pd.DataFrame(index=aligned.index)
    result["hedge_ratio"] = ratios
    result["intercept"] = intercepts
    result["spread"] = log_a - ratios * log_b - intercepts

    rolling_mean = result["spread"].rolling(60, min_periods=30).mean()
    rolling_std = result["spread"].rolling(60, min_periods=30).std()
    result["z_score"] = (result["spread"] - rolling_mean) / rolling_std.replace(0, np.nan)
    result["z_score"] = result["z_score"].fillna(0)

    return result


def compute_spread_zscore(spread: pd.Series, window: int = 60) -> pd.Series:
    """Compute rolling z-score of a spread series."""
    rolling_mean = spread.rolling(window, min_periods=30).mean()
    rolling_std = spread.rolling(window, min_periods=30).std()
    z = (spread - rolling_mean) / rolling_std.replace(0, np.nan)
    return z.fillna(0)


def compute_half_life(spread: pd.Series) -> float:
    """
    Estimate mean-reversion half-life via Ornstein-Uhlenbeck.
    Regress Δs_t on s_{t-1}: Δs = a + b * s_{t-1} + ε
    Half-life = -ln(2) / b
    """
    spread = spread.dropna()
    if len(spread) < 30:
        return float("inf")

    s = spread.values
    delta_s = np.diff(s)
    s_lag = s[:-1]

    X = np.column_stack([np.ones(len(s_lag)), s_lag])
    try:
        coeffs = np.linalg.lstsq(X, delta_s, rcond=None)[0]
        b = coeffs[1]
        if b >= 0:
            return float("inf")  # Not mean-reverting
        half_life = -np.log(2) / b
        return round(half_life, 1)
    except Exception:
        return float("inf")


def compute_covariance_matrix(returns_df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Compute Ledoit-Wolf shrinkage covariance matrix and derived correlation matrix.
    Returns (covariance_df, correlation_df).
    """
    from sklearn.covariance import LedoitWolf

    clean = returns_df.dropna()
    if len(clean) < 60 or clean.shape[1] < 2:
        return pd.DataFrame(), pd.DataFrame()

    lw = LedoitWolf()
    lw.fit(clean.values)
    cov = pd.DataFrame(lw.covariance_, index=clean.columns, columns=clean.columns)

    # Correlation matrix
    std = np.sqrt(np.diag(lw.covariance_))
    std_outer = np.outer(std, std)
    std_outer[std_outer == 0] = 1  # Avoid division by zero
    corr = pd.DataFrame(lw.covariance_ / std_outer, index=clean.columns, columns=clean.columns)

    return cov, corr


def screen_pair_candidates(
    correlation_matrix: pd.DataFrame,
    threshold: float = 0.7,
    sub_sector_map: dict | None = None,
) -> list[tuple[str, str, float]]:
    """
    Screen for pair candidates with correlation above threshold.
    Optionally filter to same sub-sector.
    Returns list of (ticker_a, ticker_b, correlation).
    """
    pairs = []
    tickers = correlation_matrix.columns.tolist()
    for i in range(len(tickers)):
        for j in range(i + 1, len(tickers)):
            corr = correlation_matrix.iloc[i, j]
            if abs(corr) >= threshold:
                a, b = tickers[i], tickers[j]
                if sub_sector_map:
                    if sub_sector_map.get(a) != sub_sector_map.get(b):
                        continue
                pairs.append((a, b, round(corr, 4)))
    pairs.sort(key=lambda x: -abs(x[2]))
    return pairs
