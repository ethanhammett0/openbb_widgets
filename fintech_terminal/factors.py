"""
Factor Construction
Builds the 10-factor daily return matrix from multiple data sources.
All indices are normalized to pd.Timestamp to prevent str/Timestamp mismatch.
"""
import logging
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

import data_providers as dp

logger = logging.getLogger(__name__)


def _ensure_datetime_index(series_or_df):
    """Ensure the index is a DatetimeIndex (not string dates)."""
    if series_or_df is None or (hasattr(series_or_df, 'empty') and series_or_df.empty):
        return series_or_df
    if not isinstance(series_or_df.index, pd.DatetimeIndex):
        series_or_df.index = pd.to_datetime(series_or_df.index)
    return series_or_df


def build_factor_matrix(from_date: str | None = None, to_date: str | None = None) -> pd.DataFrame:
    """
    Build the 10-factor daily return matrix.
    All intermediate series are datetime-indexed before joining.
    """
    if to_date is None:
        to_date = datetime.now().strftime("%Y-%m-%d")
    if from_date is None:
        from_date = (datetime.now() - timedelta(days=756)).strftime("%Y-%m-%d")

    # ── 1. Fama-French factors (Mkt-RF, SMB, HML, Mom, ST-Rev) ──
    ff = dp.get_french_factors()
    if ff.empty:
        logger.warning("French factors empty, using zero-filled placeholder")
        dates = pd.bdate_range(from_date, to_date)
        ff = pd.DataFrame(0.0, index=dates, columns=["Mkt-RF", "SMB", "HML", "Mom", "ST-Rev"])
    else:
        ff = _ensure_datetime_index(ff)
        ff = ff.loc[from_date:to_date].copy()

    # Ensure all 5 FF columns exist
    for col in ["Mkt-RF", "SMB", "HML", "Mom", "ST-Rev"]:
        if col not in ff.columns:
            ff[col] = 0.0

    # ── 2. Crypto-Beta: 50/50 BTC + ETH daily returns ──
    try:
        crypto_ret = dp.get_crypto_daily_returns(
            days=max(756, (pd.Timestamp(to_date) - pd.Timestamp(from_date)).days + 30)
        )
        crypto_ret = _ensure_datetime_index(crypto_ret)
        if not crypto_ret.empty and "BTC" in crypto_ret.columns and "ETH" in crypto_ret.columns:
            crypto_beta = (crypto_ret["BTC"] + crypto_ret["ETH"]) / 2.0
            crypto_beta.name = "Crypto-Beta"
        else:
            crypto_beta = pd.Series(0.0, index=ff.index, name="Crypto-Beta")
    except Exception as e:
        logger.warning(f"Crypto-Beta fallback to zero: {e}")
        crypto_beta = pd.Series(0.0, index=ff.index, name="Crypto-Beta")

    # ── 3. Rate-Sensitivity: TLT daily returns ──
    tlt_ret = _ensure_datetime_index(dp.get_daily_returns("TLT", from_date, to_date))
    tlt_ret.name = "Rate-Sensitivity"

    # ── 4. Credit-Cycle: HYG - LQD daily returns ──
    hyg_ret = _ensure_datetime_index(dp.get_daily_returns("HYG", from_date, to_date))
    lqd_ret = _ensure_datetime_index(dp.get_daily_returns("LQD", from_date, to_date))
    if not hyg_ret.empty and not lqd_ret.empty:
        aligned = pd.DataFrame({"HYG": hyg_ret, "LQD": lqd_ret}).dropna()
        credit_cycle = aligned["HYG"] - aligned["LQD"]
        credit_cycle.name = "Credit-Cycle"
    else:
        credit_cycle = pd.Series(0.0, index=ff.index, name="Credit-Cycle")

    # ── 5. Payments-Volume: EW(V, MA, PYPL) daily returns ──
    payments_rets = dp.get_multi_daily_returns(["V", "MA", "PYPL"], from_date, to_date)
    payments_rets = _ensure_datetime_index(payments_rets)
    if not payments_rets.empty:
        payments_vol = payments_rets.mean(axis=1)
        payments_vol.name = "Payments-Volume"
    else:
        payments_vol = pd.Series(0.0, index=ff.index, name="Payments-Volume")

    # ── 6. Fintech-vs-Bank: IPAY - XLF daily returns ──
    ipay_ret = _ensure_datetime_index(dp.get_daily_returns("IPAY", from_date, to_date))
    xlf_ret = _ensure_datetime_index(dp.get_daily_returns("XLF", from_date, to_date))
    if not ipay_ret.empty and not xlf_ret.empty:
        aligned2 = pd.DataFrame({"IPAY": ipay_ret, "XLF": xlf_ret}).dropna()
        fintech_bank = aligned2["IPAY"] - aligned2["XLF"]
        fintech_bank.name = "Fintech-vs-Bank"
    else:
        fintech_bank = pd.Series(0.0, index=ff.index, name="Fintech-vs-Bank")

    # ── Combine all factors ──
    custom_factors = pd.DataFrame({
        "Crypto-Beta": crypto_beta,
        "Rate-Sensitivity": tlt_ret,
        "Credit-Cycle": credit_cycle,
        "Payments-Volume": payments_vol,
        "Fintech-vs-Bank": fintech_bank,
    })
    custom_factors = _ensure_datetime_index(custom_factors)

    # Align indices — both sides must be DatetimeIndex
    ff_subset = ff[["Mkt-RF", "SMB", "HML", "Mom", "ST-Rev"]]
    combined = ff_subset.join(custom_factors, how="outer")
    combined = combined.sort_index().fillna(0.0)
    combined = combined.loc[from_date:to_date]
    combined.index = pd.to_datetime(combined.index)

    logger.info(f"Factor matrix built: {combined.shape}, range {combined.index[0]} to {combined.index[-1]}" if not combined.empty else "Factor matrix empty")
    return combined
