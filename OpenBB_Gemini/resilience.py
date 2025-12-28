import asyncio
import functools
import logging
import random

logger = logging.getLogger("gemini.resilience")

def with_backoff(max_retries: int = 5, base_delay: float = 2.0):
    """
    Decorator to apply exponential backoff to async functions.
    Delay = base_delay * (2 ^ (retry - 1)) + jitter
    """
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            retries = 0
            while True:
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    retries += 1
                    if retries >= max_retries:
                        logger.error(f"[Resilience] Max retries ({max_retries}) reached for {func.__name__}: {e}")
                        raise e
                    
                    delay = base_delay * (2 ** (retries - 1))
                    # Add simple jitter (0-1s) to prevent thundering herd
                    delay += random.random()
                    
                    logger.warning(f"[Resilience] Error in {func.__name__}: {e}. Retrying ({retries}/{max_retries}) in {delay:.2f}s...")
                    await asyncio.sleep(delay)
        return wrapper
    return decorator
