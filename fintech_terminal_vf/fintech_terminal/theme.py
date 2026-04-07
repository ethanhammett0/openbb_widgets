"""
Visual Theme & Number Formatters
Unified color palette and formatting for hedge-fund-grade aesthetics.
"""

# ═══════════════════════════════════════════════════════════════════════════
# Color Palette — "Midnight Fintech"
# ═══════════════════════════════════════════════════════════════════════════

# Accent colors
CYAN        = "#00D4AA"   # Primary accent (teal-cyan)
BLUE        = "#3B82F6"   # Secondary
PURPLE      = "#8B5CF6"   # Tertiary
PINK        = "#EC4899"   # Highlight

# Semantic colors
BULL        = "#00E396"   # Positive / gain (vivid green)
BEAR        = "#FF4560"   # Negative / loss (vivid red)
WARN        = "#FEB019"   # Warning / caution (amber)
NEUTRAL     = "#94A3B8"   # Neutral (slate)

# Chart trace palette — 10 harmonious colors for multi-series
TRACE_COLORS = [
    "#00D4AA",  # Teal
    "#3B82F6",  # Blue
    "#8B5CF6",  # Purple
    "#EC4899",  # Pink
    "#F59E0B",  # Amber
    "#10B981",  # Emerald
    "#06B6D4",  # Cyan
    "#F97316",  # Orange
    "#6366F1",  # Indigo
    "#14B8A6",  # Teal-green
]

# Heatmap scales
HEATMAP_DIVERGING = [
    [0, "#1E3A5F"],    # Deep navy (negative)
    [0.25, "#3B82F6"], # Blue
    [0.5, "#1E293B"],  # Dark slate (zero)
    [0.75, "#F59E0B"], # Amber
    [1, "#FF4560"],    # Red (positive)
]

HEATMAP_PERFORMANCE = [
    [0, "#FF4560"],    # Deep red (worst)
    [0.35, "#FEB019"], # Amber
    [0.5, "#1E293B"],  # Dark (zero)
    [0.65, "#00D4AA"], # Teal
    [1, "#00E396"],    # Vivid green (best)
]

HEATMAP_FACTOR = "RdBu_r"  # Built-in for factor betas (red=negative, blue=positive)
HEATMAP_CORR = "RdBu_r"


# ═══════════════════════════════════════════════════════════════════════════
# Chart Layout Preset
# ═══════════════════════════════════════════════════════════════════════════

def chart_layout(theme="dark", **overrides):
    """Base Plotly layout for all charts — consistent dark theme."""
    base = dict(
        template="plotly_dark" if theme == "dark" else "plotly_white",
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        font=dict(family="Inter, system-ui, sans-serif", size=11, color="#E2E8F0"),
        margin=dict(l=50, r=20, t=10, b=40),
        legend=dict(
            orientation="h", y=-0.15,
            font=dict(size=10, color="#94A3B8"),
            bgcolor="rgba(0,0,0,0)",
        ),
        xaxis=dict(
            gridcolor="rgba(148,163,184,0.08)",
            zerolinecolor="rgba(148,163,184,0.15)",
            tickfont=dict(family="Arial Black, sans-serif", size=12, color="#F8FAFC"),
        ),
        yaxis=dict(
            gridcolor="rgba(148,163,184,0.08)",
            zerolinecolor="rgba(148,163,184,0.15)",
            tickfont=dict(family="Arial Black, sans-serif", size=12, color="#F8FAFC"),
        ),
        hoverlabel=dict(
            bgcolor="#1E293B",
            bordercolor="#334155",
            font=dict(size=11, color="#E2E8F0"),
        ),
        colorway=TRACE_COLORS,
    )
    base.update(overrides)
    return base


# ═══════════════════════════════════════════════════════════════════════════
# Number Formatters
# ═══════════════════════════════════════════════════════════════════════════

def fmt_price(val):
    """Format as dollar price: $1,234.56"""
    if val is None or val == 0:
        return "$0.00"
    return f"${val:,.2f}"


def fmt_pct(val, decimals=2):
    """Format as percentage: +5.25% or -3.10%"""
    if val is None:
        return "0.00%"
    sign = "+" if val > 0 else ""
    return f"{sign}{val:.{decimals}f}%"


def fmt_volume(val):
    """Format volume with K/M/B suffixes: 1.2M, 345.6K"""
    if val is None or val == 0:
        return "—"
    abs_val = abs(val)
    if abs_val >= 1_000_000_000:
        return f"{val/1e9:.1f}B"
    elif abs_val >= 1_000_000:
        return f"{val/1e6:.1f}M"
    elif abs_val >= 1_000:
        return f"{val/1e3:.1f}K"
    return f"{val:,.0f}"


def fmt_beta(val, decimals=3):
    """Format beta coefficient: 1.234"""
    if val is None:
        return "—"
    return f"{val:.{decimals}f}"


def fmt_zscore(val):
    """Format z-score with sign: +2.15 or -1.30"""
    if val is None:
        return "—"
    sign = "+" if val > 0 else ""
    return f"{sign}{val:.2f}"


def fmt_ratio(val, decimals=4):
    """Format ratio/hedge ratio: 0.9234"""
    if val is None:
        return "—"
    return f"{val:.{decimals}f}"


def fmt_currency_compact(val):
    """Format large dollar amounts: $1.2B, $345.6M"""
    if val is None or val == 0:
        return "$0"
    abs_val = abs(val)
    sign = "-" if val < 0 else ""
    if abs_val >= 1_000_000_000:
        return f"{sign}${abs_val/1e9:.1f}B"
    elif abs_val >= 1_000_000:
        return f"{sign}${abs_val/1e6:.1f}M"
    elif abs_val >= 1_000:
        return f"{sign}${abs_val/1e3:.1f}K"
    return f"{sign}${abs_val:,.2f}"


def fmt_days(val):
    """Format days: 12.5d"""
    if val is None or val >= 999:
        return "∞"
    return f"{val:.1f}d"


# Color helpers for table flags
def flag_pct(val, warn_threshold=5, alert_threshold=10):
    """Return flag emoji based on magnitude of percentage."""
    if val is None:
        return ""
    mag = abs(val)
    if mag >= alert_threshold:
        return "🔴"
    elif mag >= warn_threshold:
        return "🟡"
    elif mag >= 2:
        return "🟢"
    return ""


def flag_zscore(val):
    """Return flag emoji based on z-score."""
    if val is None:
        return ""
    mag = abs(val)
    if mag >= 2.5:
        return "🔴"
    elif mag >= 2.0:
        return "🟠"
    elif mag >= 1.5:
        return "🟡"
    return ""


# ═══════════════════════════════════════════════════════════════════════════
# Bloomberg-Style Color Coding
# ═══════════════════════════════════════════════════════════════════════════

# Bloomberg terminal color constants
BBG_GREEN  = "#00C805"   # Positive return / up
BBG_RED    = "#FF3B30"   # Negative return / down
BBG_AMBER  = "#F59E0B"   # Near-zero / caution band
BBG_NEUTRAL = "#E2E8F0"  # Zero / unchanged (near-white)


def bbg_color_pct(val, near_zero_band=0.10):
    """
    Bloomberg-style color for a percentage value.
    Returns hex color string.
      > +near_zero_band → green
      < -near_zero_band → red
      within band       → amber
      exactly 0 / None  → neutral white
    """
    if val is None:
        return BBG_NEUTRAL
    if val == 0:
        return BBG_NEUTRAL
    if abs(val) <= near_zero_band:
        return BBG_AMBER
    return BBG_GREEN if val > 0 else BBG_RED


def bbg_color_zscore(val):
    """Bloomberg color for z-scores — red extremes, amber moderate, neutral near-zero."""
    if val is None:
        return BBG_NEUTRAL
    mag = abs(val)
    if mag >= 2.0:
        return BBG_RED
    elif mag >= 1.5:
        return BBG_AMBER
    elif mag >= 0.5:
        return BBG_GREEN if val > 0 else BBG_RED
    return BBG_NEUTRAL


def fmt_mktcap(val):
    """Format market cap: $4.2B, $345.6M, $12.3K"""
    if val is None or val == 0:
        return "—"
    abs_val = abs(val)
    if abs_val >= 1_000_000_000:
        return f"${abs_val/1e9:.1f}B"
    elif abs_val >= 1_000_000:
        return f"${abs_val/1e6:.1f}M"
    elif abs_val >= 1_000:
        return f"${abs_val/1e3:.1f}K"
    return f"${abs_val:,.0f}"


# ═══════════════════════════════════════════════════════════════════════════
# Hierarchical Period Selector — shared utility
# ═══════════════════════════════════════════════════════════════════════════

from datetime import datetime, timedelta, date


def parse_period_code(code: str) -> tuple[str, int]:
    """
    Parse a thinkorswim-style period code into (period_unit, period_value).

    Supported codes:
      '1D', '7D', '30D', '60D', '90D', '180D'   → ('days', N)
      '1M', '3M', '6M', '9M', '12M'             → ('months', N)
      '1Y', '2Y', '3Y', '5Y', '10Y'             → ('years', N)
      'YTD'                                       → ('ytd', 0)

    Falls back to ('months', 3) for unrecognized codes.
    """
    code = code.strip().upper()
    if code == "YTD":
        return ("ytd", 0)
    if code.endswith("D"):
        try:
            return ("days", int(code[:-1]))
        except ValueError:
            pass
    elif code.endswith("M"):
        try:
            return ("months", int(code[:-1]))
        except ValueError:
            pass
    elif code.endswith("Y"):
        try:
            return ("years", int(code[:-1]))
        except ValueError:
            pass
    return ("months", 3)


def parse_period_param(period: str) -> tuple[str, int]:
    """
    Parse a (possibly multi-select comma-separated) period param.
    Returns the FIRST period code parsed — use for single-period widgets.
    """
    first = period.split(",")[0].strip()
    return parse_period_code(first)


def period_to_dates(period_unit: str, period_value: int) -> tuple[str, str]:
    """
    Convert hierarchical period selector params to (start_date, end_date) strings.

    period_unit: 'days' | 'months' | 'years' | 'ytd'
    period_value: integer number of units (ignored for 'ytd')

    Returns: (start_date_str, end_date_str) in YYYY-MM-DD format
    """
    today = datetime.now()
    end_str = today.strftime("%Y-%m-%d")

    if period_unit == "ytd":
        start = datetime(today.year, 1, 1)
    elif period_unit == "days":
        start = today - timedelta(days=max(1, period_value))
    elif period_unit == "months":
        # Approximate: 1 month = 30.44 days
        days = int(max(1, period_value) * 30.44)
        start = today - timedelta(days=days)
    elif period_unit == "years":
        days = int(max(1, period_value) * 365.25)
        start = today - timedelta(days=days)
    else:
        # Default: 1 month
        start = today - timedelta(days=30)

    return start.strftime("%Y-%m-%d"), end_str


def period_dates_from_code(code: str) -> tuple[str, str]:
    """Shortcut: parse a period code and return (start_date, end_date)."""
    unit, value = parse_period_code(code)
    return period_to_dates(unit, value)


def period_to_trading_days(period_unit: str, period_value: int) -> int:
    """
    Convert hierarchical period selector to approximate number of trading days.
    Used for lookback windows in factor/beta calculations.

    Trading day approximations:
      1 day    → 1
      1 month  → 21
      1 year   → 252
    """
    v = max(1, period_value)
    if period_unit == "days":
        return v
    elif period_unit == "months":
        return v * 21
    elif period_unit == "years":
        return v * 252
    elif period_unit == "ytd":
        today = datetime.now()
        jan1 = datetime(today.year, 1, 1)
        cal_days = (today - jan1).days
        # Rough trading day conversion: ~252/365
        return max(5, int(cal_days * 0.69))
    return 21  # fallback


def trading_days_from_code(code: str) -> int:
    """Shortcut: parse a period code and return trading days."""
    unit, value = parse_period_code(code)
    return period_to_trading_days(unit, value)


def period_label(period_unit: str, period_value: int) -> str:
    """Human-readable label for a period: '3M', '1Y', 'YTD', '5D'"""
    if period_unit == "ytd":
        return "YTD"
    unit_map = {"days": "D", "months": "M", "years": "Y"}
    suffix = unit_map.get(period_unit, "D")
    return f"{period_value}{suffix}"


def period_label_from_code(code: str) -> str:
    """Return human-readable label from a period code."""
    unit, value = parse_period_code(code)
    return period_label(unit, value)
