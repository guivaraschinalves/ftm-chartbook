#!/usr/bin/env python3
"""
CPI Chartbook — US Inflation Charts (FRED data, no API key needed)

Generates 8 publication-quality charts for the ftm-chartbook project:
  1. CPI All Items — YoY, QoQ annualized, MoM annualized
  2. CPI Headline vs Core — YoY
  3. CPI Headline vs Core — MoM annualized
  4. CPI Main Components — YoY (stacked-style)
  5. CPI Main Components — MoM annualized
  6. CPI Headline vs Core vs Trimmed Means — YoY
  7. CPI Diffusion Index (share of components rising above threshold)
  8. CPI Headline vs Median CPI — YoY

Data is fetched directly from FRED CSV endpoints (no API key required).
Recession bars use the USREC series from FRED (NBER dates).
"""

import os
import sys
from io import StringIO
from pathlib import Path
from datetime import datetime, timedelta
from urllib.request import urlopen, Request
from urllib.error import URLError

import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import matplotlib.ticker as mticker
from matplotlib.patches import Rectangle

# ── Configuration ────────────────────────────────────────────────────────────

CHARTS_BASE = Path(__file__).resolve().parent.parent / "charts" / "CPI - EUA"
START_DATE = "2000-01-01"  # chart x-axis starts here
FETCH_START = "1997-01-01"  # fetch earlier for rolling calcs

# Colors inspired by FtM / professional macro chartbooks
COLORS = {
    "headline":  "#1f77b4",  # blue
    "core":      "#d62728",  # red
    "food":      "#2ca02c",  # green
    "energy":    "#ff7f0e",  # orange
    "services":  "#9467bd",  # purple
    "commodities": "#8c564b",  # brown
    "shelter":   "#e377c2",  # pink
    "medical":   "#17becf",  # teal
    "trimmed16": "#bcbd22",  # olive
    "median":    "#7f7f7f",  # gray
    "sticky":    "#ff9896",  # light red
    "recession": "#e0e0e0",  # light gray
    "target":    "#aaaaaa",  # medium gray
}

FIG_SIZE = (12, 6)
DPI = 200

# ── FRED Series IDs ──────────────────────────────────────────────────────────

SERIES = {
    # Headline & Core
    "CPIAUCSL":   "CPI All Items (SA)",
    "CPILFESL":   "CPI Less Food & Energy (Core, SA)",
    # Components
    "CPIUFDSL":   "CPI Food (SA)",
    "CPIENGSL":   "CPI Energy (SA)",
    "CUSR0000SAC": "CPI Commodities Less Food & Energy (SA)",
    "CUSR0000SAS": "CPI Services Less Energy (SA)",
    "CUSR0000SAH1": "CPI Shelter (SA)",
    "CUSR0000SAM2": "CPI Medical Care Services (SA)",
    # Alternative core measures
    "TRMMEANCPIM159SFRBCLE": "16% Trimmed Mean CPI (Cleveland Fed)",
    "MEDCPIM158SFRBCLE":     "Median CPI (Cleveland Fed)",
    "STICKCPIM157SFRBATL":   "Sticky CPI (Atlanta Fed)",
    # Recession indicator
    "USREC":      "NBER Recession Indicator",
}

# ── Data Fetching ────────────────────────────────────────────────────────────

def fetch_fred_csv(series_id: str, start: str = FETCH_START) -> pd.Series:
    """Download a FRED series as a pandas Series (date-indexed) via curl."""
    import subprocess
    url = (
        f"https://fred.stlouisfed.org/graph/fredgraph.csv"
        f"?id={series_id}&cosd={start}&coed=2099-01-01"
    )
    try:
        result = subprocess.run(
            ["curl", "-sS", "--max-time", "45", "-L", url],
            capture_output=True, text=True, timeout=60,
        )
        if result.returncode != 0:
            print(f"  ⚠ curl failed for {series_id}: {result.stderr.strip()}")
            return pd.Series(dtype=float)
        text = result.stdout
    except (subprocess.TimeoutExpired, OSError) as e:
        print(f"  ⚠ Failed to fetch {series_id}: {e}")
        return pd.Series(dtype=float)

    # Check if FRED returned HTML (invalid series) instead of CSV
    if text.strip().startswith("<!DOCTYPE") or text.strip().startswith("<html"):
        print(f"  ⚠ FRED returned HTML for {series_id} (invalid series?)")
        return pd.Series(dtype=float)

    df = pd.read_csv(StringIO(text), parse_dates=["observation_date"],
                     index_col="observation_date")
    col = df.columns[0]
    s = pd.to_numeric(df[col], errors="coerce").dropna()
    s.name = series_id
    return s


def fetch_all() -> pd.DataFrame:
    """Fetch all series and return a wide DataFrame."""
    frames = {}
    for sid, label in SERIES.items():
        print(f"  Fetching {sid} ({label})...")
        s = fetch_fred_csv(sid)
        if not s.empty:
            frames[sid] = s
        else:
            print(f"    → empty, skipping")
    df = pd.DataFrame(frames)
    return df

# ── Transformations ──────────────────────────────────────────────────────────

def pct_change_annualized(s: pd.Series, periods: int = 1) -> pd.Series:
    """Percentage change annualized.
    For monthly data: ((x/x_lag)^(12/periods) - 1) * 100
    """
    ratio = s / s.shift(periods)
    return (ratio ** (12 / periods) - 1) * 100


def yoy(s: pd.Series) -> pd.Series:
    """Year-over-year percent change."""
    return s.pct_change(12) * 100


def mom_annualized(s: pd.Series) -> pd.Series:
    """Month-over-month percent change, annualized."""
    return pct_change_annualized(s, 1)


def qoq_annualized(s: pd.Series) -> pd.Series:
    """3-month percent change, annualized."""
    return pct_change_annualized(s, 3)

# ── Recession Bars ───────────────────────────────────────────────────────────

def get_recession_spans(usrec: pd.Series) -> list[tuple]:
    """Convert USREC 0/1 series to list of (start, end) date tuples."""
    spans = []
    in_recession = False
    start = None
    for date, val in usrec.items():
        if val == 1 and not in_recession:
            start = date
            in_recession = True
        elif val == 0 and in_recession:
            spans.append((start, date))
            in_recession = False
    if in_recession:
        spans.append((start, usrec.index[-1]))
    return spans


def add_recession_bars(ax, recession_spans, alpha=0.15):
    """Add gray recession shading to an axes."""
    ymin, ymax = ax.get_ylim()
    for start, end in recession_spans:
        ax.axvspan(start, end, color=COLORS["recession"],
                   alpha=0.6, zorder=0, linewidth=0)

# ── Chart Helpers ────────────────────────────────────────────────────────────

def setup_chart(title: str, ylabel: str = "% a.a.",
                figsize=FIG_SIZE) -> tuple:
    """Create a styled figure and axes."""
    fig, ax = plt.subplots(figsize=figsize, dpi=DPI)
    ax.set_title(title, fontsize=14, fontweight="bold", pad=12, loc="left")
    ax.set_ylabel(ylabel, fontsize=10)
    ax.yaxis.set_major_formatter(mticker.FormatStrFormatter("%.1f"))
    ax.xaxis.set_major_locator(mdates.YearLocator(2))
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    ax.grid(axis="y", alpha=0.3, linewidth=0.5)
    ax.grid(axis="x", alpha=0.15, linewidth=0.5)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.tick_params(labelsize=9)
    return fig, ax


def finalize_chart(fig, ax, recession_spans, filepath: Path,
                   source="BLS via FRED", legend_loc="best"):
    """Add recession bars, source, legend, and save."""
    add_recession_bars(ax, recession_spans)
    if ax.get_legend_handles_labels()[1]:
        ax.legend(fontsize=8, loc=legend_loc, framealpha=0.9)
    # Source text
    ax.annotate(
        f"Fonte: {source}  |  FtM Chartbook  |  {datetime.now().strftime('%d/%m/%Y')}",
        xy=(0, 0), xycoords="figure fraction",
        xytext=(10, 6), textcoords="offset points",
        fontsize=7, color="#888888",
    )
    filepath.parent.mkdir(parents=True, exist_ok=True)
    fig.tight_layout(rect=[0, 0.02, 1, 1])
    fig.savefig(filepath, bbox_inches="tight")
    plt.close(fig)
    print(f"  ✓ Saved: {filepath.relative_to(CHARTS_BASE.parent.parent)}")

# ── Chart Generators ─────────────────────────────────────────────────────────

def chart_01_cpi_multihorizon(data: pd.DataFrame, recessions):
    """CPI All Items: YoY, QoQ annualized, MoM annualized (3-month MA)."""
    cpi = data["CPIAUCSL"].dropna()
    y = yoy(cpi).loc[START_DATE:]
    q = qoq_annualized(cpi).loc[START_DATE:]
    m = mom_annualized(cpi).rolling(3, min_periods=1).mean().loc[START_DATE:]

    fig, ax = setup_chart(
        "CPI All Items — Variação em Diferentes Horizontes",
        ylabel="% a.a."
    )
    ax.plot(y.index, y, color=COLORS["headline"], linewidth=2, label="YoY (12 meses)")
    ax.plot(q.index, q, color=COLORS["core"], linewidth=1.3, label="QoQ anualizado (3 meses)", alpha=0.85)
    ax.plot(m.index, m, color=COLORS["energy"], linewidth=1, label="MoM anualizado (MM3)", alpha=0.7)
    ax.axhline(2.0, color=COLORS["target"], linestyle="--", linewidth=0.8, label="Meta 2%")
    ax.axhline(0, color="black", linewidth=0.3)

    slot = CHARTS_BASE / "01 Visão geral" / "01 - CPI All Items - Variação em Diferentes Horizontes"
    finalize_chart(fig, ax, recessions, slot / "grafico.png")


def chart_02_headline_vs_core_yoy(data: pd.DataFrame, recessions):
    """CPI Headline vs Core — YoY."""
    h = yoy(data["CPIAUCSL"]).loc[START_DATE:]
    c = yoy(data["CPILFESL"]).loc[START_DATE:]

    fig, ax = setup_chart("CPI Headline e Core — Variação Anual (YoY)")
    ax.plot(h.index, h, color=COLORS["headline"], linewidth=2, label="CPI All Items")
    ax.plot(c.index, c, color=COLORS["core"], linewidth=2, label="CPI Core (ex-Food & Energy)")
    ax.axhline(2.0, color=COLORS["target"], linestyle="--", linewidth=0.8, label="Meta 2%")
    ax.axhline(0, color="black", linewidth=0.3)

    slot = CHARTS_BASE / "01 Visão geral" / "02 - CPI Headline e Core - Variação Anual"
    finalize_chart(fig, ax, recessions, slot / "grafico.png")


def chart_03_headline_vs_core_mom(data: pd.DataFrame, recessions):
    """CPI Headline vs Core — MoM annualized (3-month MA)."""
    h = mom_annualized(data["CPIAUCSL"]).rolling(3, min_periods=1).mean().loc[START_DATE:]
    c = mom_annualized(data["CPILFESL"]).rolling(3, min_periods=1).mean().loc[START_DATE:]

    fig, ax = setup_chart("CPI Headline e Core — MoM Anualizado (MM3)")
    ax.plot(h.index, h, color=COLORS["headline"], linewidth=1.8, label="CPI All Items")
    ax.plot(c.index, c, color=COLORS["core"], linewidth=1.8, label="CPI Core")
    ax.axhline(2.0, color=COLORS["target"], linestyle="--", linewidth=0.8, label="Meta 2%")
    ax.axhline(0, color="black", linewidth=0.3)

    slot = CHARTS_BASE / "01 Visão geral" / "03 - CPI Headline e Core - MoM Anualizado"
    finalize_chart(fig, ax, recessions, slot / "grafico.png")


def chart_04_components_yoy(data: pd.DataFrame, recessions):
    """CPI Main Components — YoY."""
    components = {
        "CPIUFDSL":     ("Food", COLORS["food"]),
        "CPIENGSL":     ("Energy", COLORS["energy"]),
        "CUSR0000SAH1": ("Shelter", COLORS["shelter"]),
        "CUSR0000SAM2": ("Medical Care", COLORS["medical"]),
        "CUSR0000SAC":  ("Commodities (ex-Food & Energy)", COLORS["commodities"]),
        "CUSR0000SAS":  ("Services (ex-Energy)", COLORS["services"]),
    }

    fig, ax = setup_chart("CPI — Componentes, Variação Anual (YoY)")
    for sid, (label, color) in components.items():
        if sid in data.columns:
            s = yoy(data[sid]).loc[START_DATE:]
            ax.plot(s.index, s, color=color, linewidth=1.4,
                    label=label, alpha=0.85)

    ax.axhline(0, color="black", linewidth=0.3)

    slot = CHARTS_BASE / "02 Componentes" / "01 - CPI Componentes - Variação Anual"
    finalize_chart(fig, ax, recessions, slot / "grafico.png",
                   legend_loc="upper left")


def chart_05_components_mom(data: pd.DataFrame, recessions):
    """CPI Main Components — MoM annualized (3-month MA)."""
    components = {
        "CPIUFDSL":     ("Food", COLORS["food"]),
        "CPIENGSL":     ("Energy", COLORS["energy"]),
        "CUSR0000SAH1": ("Shelter", COLORS["shelter"]),
        "CUSR0000SAS":  ("Services (ex-Energy)", COLORS["services"]),
    }

    fig, ax = setup_chart("CPI — Componentes Selecionados, MoM Anualizado (MM3)")
    for sid, (label, color) in components.items():
        if sid in data.columns:
            s = mom_annualized(data[sid]).rolling(3, min_periods=1).mean().loc[START_DATE:]
            ax.plot(s.index, s, color=color, linewidth=1.4,
                    label=label, alpha=0.85)

    ax.axhline(0, color="black", linewidth=0.3)

    slot = CHARTS_BASE / "02 Componentes" / "02 - CPI Componentes Selecionados - MoM Anualizado"
    finalize_chart(fig, ax, recessions, slot / "grafico.png",
                   legend_loc="upper left")


def chart_06_core_measures(data: pd.DataFrame, recessions):
    """CPI Headline vs Trimmed Mean, Median CPI, Sticky CPI — YoY."""
    fig, ax = setup_chart("CPI e Medidas Alternativas de Núcleo — Variação Anual")

    h = yoy(data["CPIAUCSL"]).loc[START_DATE:]
    ax.plot(h.index, h, color=COLORS["headline"], linewidth=2, label="CPI All Items")

    c = yoy(data["CPILFESL"]).loc[START_DATE:]
    ax.plot(c.index, c, color=COLORS["core"], linewidth=1.6, label="CPI Core")

    # Cleveland Fed Trimmed Mean (already a rate, annualized)
    if "TRMMEANCPIM159SFRBCLE" in data.columns:
        t = data["TRMMEANCPIM159SFRBCLE"].loc[START_DATE:]
        ax.plot(t.index, t, color=COLORS["trimmed16"], linewidth=1.4,
                label="16% Trimmed Mean (Cleveland Fed)")

    # Cleveland Fed Median CPI (already a rate, annualized)
    if "MEDCPIM158SFRBCLE" in data.columns:
        m = data["MEDCPIM158SFRBCLE"].loc[START_DATE:]
        ax.plot(m.index, m, color=COLORS["median"], linewidth=1.4,
                label="Median CPI (Cleveland Fed)", linestyle="--")

    # Atlanta Fed Sticky CPI (comes as monthly rate — annualize)
    if "STICKCPIM157SFRBATL" in data.columns:
        s = (data["STICKCPIM157SFRBATL"] * 12).loc[START_DATE:]
        ax.plot(s.index, s, color=COLORS["sticky"], linewidth=1.4,
                label="Sticky CPI (Atlanta Fed)", linestyle="-.")

    ax.axhline(2.0, color=COLORS["target"], linestyle="--", linewidth=0.8, label="Meta 2%")
    ax.axhline(0, color="black", linewidth=0.3)

    slot = CHARTS_BASE / "03 Núcleos e Medidas Alternativas" / "01 - CPI e Medidas Alternativas de Núcleo - Variação Anual"
    finalize_chart(fig, ax, recessions, slot / "grafico.png",
                   source="BLS, Cleveland Fed, Atlanta Fed via FRED",
                   legend_loc="upper left")


def chart_07_diffusion_index(data: pd.DataFrame, recessions):
    """CPI Diffusion Index — Share of components with YoY > 2% and > 3%.

    Inspired by the Fed Notes article "New tools to monitor inflation in
    real time" (Smith & Wolman, 2024). We construct a CPI-based diffusion
    index using the available component series: the fraction of components
    with YoY inflation above 2% (target) and above 3%.
    """
    # Use available component series for diffusion
    component_ids = [
        "CPIUFDSL", "CPIENGSL", "CUSR0000SAC", "CUSR0000SAS",
        "CUSR0000SAH1", "CUSR0000SAM2",
    ]
    available = [s for s in component_ids if s in data.columns]
    if len(available) < 3:
        print("  ⚠ Not enough components for diffusion index, skipping")
        return

    # Compute YoY for each
    yoy_df = pd.DataFrame({s: yoy(data[s]) for s in available})

    # Share above 2% threshold (smoothed with 3-month MA)
    above_2_raw = (yoy_df > 2.0).mean(axis=1) * 100
    above_3_raw = (yoy_df > 3.0).mean(axis=1) * 100
    above_2 = above_2_raw.rolling(3, min_periods=1).mean().loc[START_DATE:]
    above_3 = above_3_raw.rolling(3, min_periods=1).mean().loc[START_DATE:]

    fig, ax = setup_chart(
        "CPI — Índice de Difusão (Parcela de Componentes Acima do Limiar, MM3)",
        ylabel="% dos componentes"
    )
    ax.fill_between(above_2.index, above_2, alpha=0.25, color=COLORS["headline"])
    ax.plot(above_2.index, above_2, color=COLORS["headline"], linewidth=1.8,
            label="Componentes com YoY > 2%")
    ax.fill_between(above_3.index, above_3, alpha=0.2, color=COLORS["core"])
    ax.plot(above_3.index, above_3, color=COLORS["core"], linewidth=1.4,
            label="Componentes com YoY > 3%", linestyle="--")
    ax.axhline(50, color=COLORS["target"], linestyle=":", linewidth=0.8, label="50%")
    ax.set_ylim(-5, 105)
    ax.yaxis.set_major_formatter(mticker.FormatStrFormatter("%.0f"))

    slot = CHARTS_BASE / "03 Núcleos e Medidas Alternativas" / "02 - CPI Índice de Difusão"
    finalize_chart(fig, ax, recessions, slot / "grafico.png",
                   legend_loc="lower left")


def chart_08_shelter_deep_dive(data: pd.DataFrame, recessions):
    """Shelter CPI (biggest core component) — all three horizons."""
    if "CUSR0000SAH1" not in data.columns:
        print("  ⚠ Shelter data unavailable, skipping chart 8")
        return

    shelter = data["CUSR0000SAH1"]
    y = yoy(shelter).loc[START_DATE:]
    q = qoq_annualized(shelter).loc[START_DATE:]
    m = mom_annualized(shelter).rolling(3, min_periods=1).mean().loc[START_DATE:]

    fig, ax = setup_chart(
        "CPI Shelter — Variação em Diferentes Horizontes",
        ylabel="% a.a."
    )
    ax.plot(y.index, y, color=COLORS["shelter"], linewidth=2, label="YoY (12 meses)")
    ax.plot(q.index, q, color=COLORS["services"], linewidth=1.3, label="QoQ anualizado (3 meses)", alpha=0.85)
    ax.plot(m.index, m, color=COLORS["medical"], linewidth=1, label="MoM anualizado (MM3)", alpha=0.7)
    ax.axhline(0, color="black", linewidth=0.3)

    slot = CHARTS_BASE / "02 Componentes" / "03 - CPI Shelter - Variação em Diferentes Horizontes"
    finalize_chart(fig, ax, recessions, slot / "grafico.png")


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("CPI Chartbook — Gerando gráficos de inflação dos EUA")
    print("=" * 60)

    print("\n📥 Baixando dados do FRED...")
    data = fetch_all()

    if data.empty:
        print("❌ Nenhum dado obtido. Verifique sua conexão.")
        sys.exit(1)

    print(f"\n📊 Dados obtidos: {len(data.columns)} séries, "
          f"{len(data)} observações")

    # Recession spans
    recessions = []
    if "USREC" in data.columns:
        recessions = get_recession_spans(data["USREC"])
        print(f"  Recessões encontradas: {len(recessions)}")

    print("\n🎨 Gerando gráficos...\n")

    chart_01_cpi_multihorizon(data, recessions)
    chart_02_headline_vs_core_yoy(data, recessions)
    chart_03_headline_vs_core_mom(data, recessions)
    chart_04_components_yoy(data, recessions)
    chart_05_components_mom(data, recessions)
    chart_06_core_measures(data, recessions)
    chart_07_diffusion_index(data, recessions)
    chart_08_shelter_deep_dive(data, recessions)

    print("\n✅ Todos os gráficos gerados com sucesso!")
    print(f"   Pasta: {CHARTS_BASE.relative_to(CHARTS_BASE.parent.parent)}")


if __name__ == "__main__":
    main()
