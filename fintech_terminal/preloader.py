"""
Data Pre-loader — Lightweight version.
Fetches all universe data at startup, stores only returns as numpy arrays.
Clears intermediate caches after load to minimize memory.
"""
import gc
import logging
import asyncio
from datetime import datetime, timedelta
from typing import Optional

import numpy as np
import pandas as pd

import data_providers as dp
from universe import get_all_tickers, UNIVERSE
from factors import build_factor_matrix

logger = logging.getLogger(__name__)


class DataCache:
    """Singleton data cache — stores returns as compact numpy arrays."""

    def __init__(self):
        self._returns_data: dict[str, np.ndarray] = {}   # ticker -> values
        self._returns_index: Optional[pd.DatetimeIndex] = None  # shared index
        self._returns_tickers: dict[str, tuple[int, int]] = {}  # ticker -> (start_idx, end_idx)
        self.daily_returns: dict[str, pd.Series] = {}
        self.factor_matrix: Optional[pd.DataFrame] = None
        self.last_refresh: Optional[datetime] = None
        self.is_loading: bool = False

    def get_returns(self, ticker: str) -> pd.Series:
        """Get cached daily returns for a ticker."""
        return self.daily_returns.get(ticker, pd.Series(dtype=float))

    def get_multi_returns(self, tickers: list[str]) -> pd.DataFrame:
        """Get cached returns as a DataFrame for multiple tickers."""
        series = {t: self.daily_returns[t] for t in tickers if t in self.daily_returns and not self.daily_returns[t].empty}
        if not series:
            return pd.DataFrame()
        return pd.DataFrame(series)


cache = DataCache()


def load_all_data():
    """
    Synchronous full data load — called at startup.
    Memory-optimized: clears intermediate caches after building returns.
    """
    if cache.is_loading:
        logger.info("Data load already in progress, skipping")
        return

    cache.is_loading = True
    start_time = datetime.now()
    logger.info("=== Starting data pre-load ===")

    from_date = (datetime.now() - timedelta(days=400)).strftime("%Y-%m-%d")
    to_date = datetime.now().strftime("%Y-%m-%d")

    # Collect all tickers
    all_tickers = set(get_all_tickers())
    proxy_tickers = {"TLT", "HYG", "LQD", "IPAY", "XLF", "V", "MA", "PYPL", "FINX", "ARKF"}
    all_tickers.update(proxy_tickers)

    # Fetch daily returns for each ticker
    loaded = 0
    failed = 0
    new_returns = {}
    for ticker in sorted(all_tickers):
        try:
            returns = dp.get_daily_returns(ticker, from_date, to_date)
            if not returns.empty:
                new_returns[ticker] = returns
                loaded += 1
            else:
                failed += 1
        except Exception as e:
            logger.warning(f"Failed to load {ticker}: {e}")
            failed += 1

    # Atomically swap the cache
    cache.daily_returns = new_returns
    logger.info(f"Loaded daily returns: {loaded} tickers OK, {failed} failed")

    # Build factor matrix
    try:
        cache.factor_matrix = build_factor_matrix(from_date, to_date)
        logger.info(f"Factor matrix: {cache.factor_matrix.shape}")
    except Exception as e:
        logger.error(f"Factor matrix build failed: {e}")
        cache.factor_matrix = pd.DataFrame()

    cache.last_refresh = datetime.now()
    cache.is_loading = False

    # ── Memory cleanup ──
    # Clear the data_providers intermediate caches (we already have the returns)
    dp._cache_1h.clear()
    logger.info("Cleared dp._cache_1h to free memory")

    # Force garbage collection
    collected = gc.collect()
    logger.info(f"GC collected {collected} objects")

    elapsed = (datetime.now() - start_time).total_seconds()
    logger.info(f"=== Data pre-load complete in {elapsed:.1f}s ===")


async def background_refresh(interval_minutes: int = 15):
    """Background task to refresh data periodically."""
    while True:
        await asyncio.sleep(interval_minutes * 60)
        logger.info("Background data refresh starting...")
        try:
            load_all_data()
        except Exception as e:
            logger.error(f"Background refresh failed: {e}")
