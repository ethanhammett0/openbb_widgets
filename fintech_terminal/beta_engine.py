"""
Beta Estimation Engine
Three modes: Rolling OLS, Fixed OLS, Kalman Filter.
"""
import logging

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


def _rolling_ols_betas(
    stock_returns: pd.Series,
    factor_returns: pd.DataFrame,
    window: int = 90,
) -> pd.DataFrame:
    """
    Rolling OLS beta estimation.
    Returns DataFrame: index=dates, columns=factor names.
    """
    aligned = pd.DataFrame({"stock": stock_returns}).join(factor_returns, how="inner").dropna()
    if len(aligned) < window:
        return pd.DataFrame()

    y = aligned["stock"].values
    X = aligned.drop(columns=["stock"]).values
    n = len(y)
    k = X.shape[1]
    factor_names = [c for c in aligned.columns if c != "stock"]

    betas = np.full((n, k), np.nan)
    for t in range(window, n):
        y_w = y[t - window : t]
        X_w = X[t - window : t]
        X_aug = np.column_stack([np.ones(window), X_w])
        try:
            coeffs = np.linalg.lstsq(X_aug, y_w, rcond=None)[0]
            betas[t] = coeffs[1:]  # Skip intercept
        except Exception:
            pass

    result = pd.DataFrame(betas, index=aligned.index, columns=factor_names)
    return result.dropna(how="all")


def _fixed_ols_betas(
    stock_returns: pd.Series,
    factor_returns: pd.DataFrame,
) -> dict:
    """
    Fixed-window OLS beta estimation — single static estimate.
    Returns dict of {factor_name: beta_value}.
    """
    aligned = pd.DataFrame({"stock": stock_returns}).join(factor_returns, how="inner").dropna()
    if len(aligned) < 30:
        return {}

    y = aligned["stock"].values
    X = aligned.drop(columns=["stock"]).values
    X_aug = np.column_stack([np.ones(len(y)), X])
    factor_names = [c for c in aligned.columns if c != "stock"]

    try:
        coeffs = np.linalg.lstsq(X_aug, y, rcond=None)[0]
        return dict(zip(factor_names, coeffs[1:]))
    except Exception:
        return {}


def _kalman_betas(
    stock_returns: pd.Series,
    factor_returns: pd.DataFrame,
    q_scale: float = 0.001,
    obs_noise: float = 0.01,
) -> pd.DataFrame:
    """
    Kalman Filter beta estimation — time-varying betas.
    Returns DataFrame: index=dates, columns=factor names.
    """
    try:
        from pykalman import KalmanFilter
    except ImportError:
        logger.warning("pykalman not installed, falling back to rolling OLS")
        return _rolling_ols_betas(stock_returns, factor_returns)

    aligned = pd.DataFrame({"stock": stock_returns}).join(factor_returns, how="inner").dropna()
    if len(aligned) < 60:
        return pd.DataFrame()

    y = aligned["stock"].values
    X = aligned.drop(columns=["stock"]).values
    factor_names = [c for c in aligned.columns if c != "stock"]
    n, k = X.shape

    # Initialize with OLS on first 60 observations
    X_init = np.column_stack([np.ones(60), X[:60]])
    try:
        init_coeffs = np.linalg.lstsq(X_init, y[:60], rcond=None)[0]
        initial_state = init_coeffs[1:]  # Skip intercept
    except Exception:
        initial_state = np.zeros(k)

    # State transition: betas follow a random walk
    transition_matrix = np.eye(k)
    transition_covariance = np.eye(k) * q_scale
    observation_covariance = np.array([[obs_noise]])
    initial_state_covariance = np.eye(k) * 1.0

    # Run Kalman filter
    # observation_matrices are time-varying: each row of X
    observation_matrices = X.reshape(n, 1, k)

    kf = KalmanFilter(
        transition_matrices=transition_matrix,
        observation_matrices=observation_matrices,
        transition_covariance=transition_covariance,
        observation_covariance=observation_covariance,
        initial_state_mean=initial_state,
        initial_state_covariance=initial_state_covariance,
    )

    filtered_state_means, _ = kf.filter(y.reshape(-1, 1))

    result = pd.DataFrame(filtered_state_means, index=aligned.index, columns=factor_names)
    return result


def estimate_betas(
    stock_returns: pd.Series,
    factor_returns: pd.DataFrame,
    mode: str = "kalman",
    window: int = 90,
    q_scale: float = 0.001,
    obs_noise: float = 0.01,
) -> dict:
    """
    Estimate current factor betas for a stock.
    Returns dict of {factor_name: beta_value}.
    """
    mode = mode.lower().replace(" ", "_")
    if mode in ("rolling_ols", "rolling"):
        ts = _rolling_ols_betas(stock_returns, factor_returns, window)
        if ts.empty:
            return {}
        return ts.iloc[-1].to_dict()
    elif mode in ("fixed_ols", "fixed"):
        return _fixed_ols_betas(stock_returns, factor_returns)
    elif mode in ("kalman", "kalman_filter"):
        ts = _kalman_betas(stock_returns, factor_returns, q_scale, obs_noise)
        if ts.empty:
            return {}
        return ts.iloc[-1].to_dict()
    else:
        return _fixed_ols_betas(stock_returns, factor_returns)


def estimate_betas_timeseries(
    stock_returns: pd.Series,
    factor_returns: pd.DataFrame,
    mode: str = "kalman",
    window: int = 90,
    q_scale: float = 0.001,
    obs_noise: float = 0.01,
) -> pd.DataFrame:
    """
    Get time-varying beta estimates.
    Returns DataFrame with dates as index, factor names as columns.
    """
    mode = mode.lower().replace(" ", "_")
    if mode in ("rolling_ols", "rolling"):
        return _rolling_ols_betas(stock_returns, factor_returns, window)
    elif mode in ("kalman", "kalman_filter"):
        return _kalman_betas(stock_returns, factor_returns, q_scale, obs_noise)
    elif mode in ("fixed_ols", "fixed"):
        betas = _fixed_ols_betas(stock_returns, factor_returns)
        if not betas:
            return pd.DataFrame()
        aligned = pd.DataFrame({"stock": stock_returns}).join(factor_returns, how="inner").dropna()
        return pd.DataFrame({f: [betas.get(f, 0)] * len(aligned) for f in betas}, index=aligned.index)
    return pd.DataFrame()


def compute_beta_zscore(
    current_betas: dict,
    beta_timeseries: pd.DataFrame,
    lookback: int = 252,
) -> dict:
    """
    Compute z-score of current betas relative to their 1-year history.
    Returns dict of {factor_name: z_score}.
    """
    if beta_timeseries.empty:
        return {}
    recent = beta_timeseries.tail(lookback)
    result = {}
    for factor in current_betas:
        if factor in recent.columns:
            mean_b = recent[factor].mean()
            std_b = recent[factor].std()
            if std_b > 1e-8:
                result[factor] = (current_betas[factor] - mean_b) / std_b
            else:
                result[factor] = 0.0
    return result
