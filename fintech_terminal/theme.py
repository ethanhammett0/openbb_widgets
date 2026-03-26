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
