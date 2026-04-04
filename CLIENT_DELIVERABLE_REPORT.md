# ElectraWireless Business Console
## Financial Projection Engine — Client Deliverable Report
### Feature Implementation Overview

---

## Purpose of This Document

This document outlines what was required by the product specification for the Financial Projection Engine and maps each requirement directly to what has been built and shipped in the frontend. Each section describes the feature, how it works, how to use it, and the mathematical formula powering it.

---

---

## Mathematical Foundations

This section documents the core equations underpinning every calculation in the engine. These are the same formulas used by investment banks and SaaS financial analysts. They are applied identically in the frontend calculation library and the backend Prophet integration.

### Core Revenue Model — Compound Growth with Churn

The engine models monthly revenue using a compounding growth rate offset by a monthly churn rate. This is the industry-standard approach for subscription or recurring-revenue businesses.

```
R(t) = R(t-1) × (1 + g) × (1 - c)

Where:
  R(t)  = Revenue in month t
  R(0)  = Starting MRR (user-defined)
  g     = Monthly growth rate (decimal, e.g. 0.08 for 8%)
  c     = Monthly churn rate (decimal, e.g. 0.03 for 3%)
  t     = Month index (1, 2, 3, … N)
```

Expanded over N months from a starting MRR:

```
R(t) = MRR₀ × [(1 + g) × (1 - c)]^t
```

This is a geometric sequence. The effective monthly growth rate net of churn is:

```
g_net = (1 + g) × (1 - c) - 1
```

> Example: 8% growth, 3% churn → g_net = (1.08)(0.97) - 1 = 4.76% effective monthly growth

---

### Cost Structure

```
COGS(t)       = R(t) × (COGS% / 100)
OpEx(t)       = Marketing + Payroll          [fixed per month]
TotalExp(t)   = COGS(t) + OpEx(t)
```

---

### Profit & Loss Line Items

```
GrossProfit(t)    = R(t) - COGS(t)
GrossMargin%(t)   = GrossProfit(t) / R(t) × 100
EBITDA(t)         = GrossProfit(t) - OpEx(t)
NetProfit(t)      = R(t) - TotalExp(t)
                  = R(t) - COGS(t) - Marketing - Payroll
```

> Note: In the current model, EBITDA and Net Profit are equivalent as depreciation, amortisation, interest, and tax are not yet applied. These are planned for the advanced tier.

---

### Cumulative Profit & Break-even

```
CumulativeProfit(t) = Σ NetProfit(i)  for i = 1 to t

Break-even Month    = min { t : CumulativeProfit(t) ≥ 0 }
```

If no such t exists within the forecast window, break-even is marked as "Not reached."

---

### Annual Recurring Revenue (ARR)

```
ARR = R(N) × 12

Where:
  R(N) = Revenue in the final forecast month N
```

ARR is an annualised snapshot of the run-rate at the end of the forecast — the standard metric used in investor decks and SaaS valuations.

---

### P&L Summary Aggregates

```
TotalRevenue    = Σ R(t)             for t = 1 to N
TotalExpenses   = Σ TotalExp(t)      for t = 1 to N
TotalNetProfit  = Σ NetProfit(t)     for t = 1 to N
AvgGrossMargin% = (1/N) × Σ GrossMargin%(t)   for t = 1 to N
```

---

### Sensitivity Analysis — ARR Matrix

For each cell in the sensitivity table, ARR is recalculated with a perturbed growth rate (g') and churn rate (c'):

```
R_sensitivity(N, g', c') = MRR₀ × [(1 + g') × (1 - c')]^N
ARR_sensitivity(g', c')  = R_sensitivity(N, g', c') × 12

Where:
  g' ∈ { g - 0.04, g - 0.02, g, g + 0.02, g + 0.04 }
  c' ∈ { c - 0.02, c - 0.01, c, c + 0.01, c + 0.02 }
```

The delta vs. the current scenario is computed for colour coding:

```
Δ ARR = ARR_sensitivity(g', c') - ARR(g, c)
  Δ > 0  → green  (improvement)
  Δ < 0  → red    (deterioration)
  Δ = 0  → gold   (current scenario)
```

---

### Prophet Forecasting Model (Backend)

Facebook Prophet decomposes the historical revenue time series into three additive components:

```
y(t) = T(t) + S(t) + H(t) + ε(t)

Where:
  T(t) = Trend component     (piecewise linear or logistic growth)
  S(t) = Seasonality         (Fourier series approximation)
  H(t) = Holiday/event effect (if configured)
  ε(t) = Residual noise      (assumed normally distributed)
```

The 80% confidence interval (uncertainty bands shown on the chart) is derived from the posterior distribution of the trend and seasonality parameters via MCMC sampling:

```
ŷ(t) = T̂(t) + Ŝ(t)
Lower(t) = ŷ(t) - 1.28 × σ(t)
Upper(t) = ŷ(t) + 1.28 × σ(t)
```

The slider-adjusted forecast is then layered on top of the Prophet baseline to show the user's override relative to the model's expectation.

---

### Scenario Preset Construction

Each preset applies a fixed parameter vector to the compound growth formula. The effective net ARR under each scenario is:

```
Bear ARR = MRR₀ × [(1.03)(0.93)]^N × 12  =  MRR₀ × [0.9579]^N × 12
Base ARR = MRR₀ × [(1.08)(0.97)]^N × 12  =  MRR₀ × [1.0476]^N × 12
Bull ARR = MRR₀ × [(1.18)(0.985)]^N × 12 =  MRR₀ × [1.1623]^N × 12
```

> At MRR₀ = $18,000 and N = 12 months:
> - Bear:  ~$18,000 × 0.601 × 12  ≈  $129,816 ARR
> - Base:  ~$18,000 × 1.757 × 12  ≈  $379,512 ARR
> - Bull:  ~$18,000 × 6.167 × 12  ≈  $1,332,072 ARR

---

## 1. User Onboarding Flow

**Requirement:** System must collect user-defined growth rates, cost drivers, and baseline financial inputs before presenting projections.

**Status: Implemented**

**Description:**
When a new user opens the console for the first time, a three-step onboarding wizard launches automatically. This wizard guides the user through setting up their financial profile before entering the main dashboard.

**How It Works:**

- **Step 1 — Account Type Selection:** The user selects whether they are operating as a Business or an Individual. This selection adjusts the default ranges and presets used throughout the entire projection engine.

- **Step 2 — Revenue & Growth Inputs:** The user sets their current starting monthly revenue and their expected monthly growth rate using sliders. A forecast period (how many months out to project) is also set here. The Business range for starting revenue is $500–$150,000/month. Growth rate spans 0–30%.

- **Step 3 — Cost Structure:** The user configures their three main cost drivers:
  - COGS % (Cost of Goods Sold as a percentage of revenue, 0–80%)
  - Marketing Spend (flat monthly dollar amount, $0–$50,000)
  - Payroll / Fixed Costs (flat monthly dollar amount, $0–$200,000)
  - A live expense summary updates in real-time, highlighting in red if total expenses exceed projected revenue — giving the user immediate financial awareness before entering the dashboard.

**When onboarding is complete:** All inputs are stored and the user is taken directly to the Financial Projection Dashboard. These values pre-populate all sliders and controls on the main dashboard.

---

## 2. Financial Projection Dashboard (Main Interface)

**Requirement:** Enable users to simulate future finances. Build revenue/expense projections and P&L forecasts. Answer "what-if" scenarios.

**Status: Implemented**

**Description:**
The main dashboard is a two-panel layout. On the left is the Input Panel (controls). On the right is the Output Panel (results and charts). The dashboard is organised into five tabs, each covering a different area of financial analysis.

---

## 3. Input Panel — Adjustable Financial Controls

**Requirement:** User-defined growth rates and cost drivers. Scenario toggling to see impact of changing assumptions.

**Status: Implemented**

**Description:**
The left sidebar contains all financial controls. Every change made here instantly updates all charts and metrics across the entire dashboard in real-time.

**Controls Available:**

| Control | Range | Description |
|---|---|---|
| Monthly Growth Rate | 0% – 30% | How fast revenue grows each month |
| Starting MRR | $1,000 – $100,000 | Starting Monthly Recurring Revenue |
| Churn Rate | 0% – 15% | Monthly customer/revenue loss rate |
| COGS % | 5% – 60% | Cost of Goods Sold as % of revenue |
| Marketing Spend | $500 – $30,000/mo | Fixed monthly marketing budget |
| Payroll | $5,000 – $150,000/mo | Fixed monthly staff and operating costs |
| Forecast Period | 3 – 24 months | How far into the future to project |

**How to use:** Drag any slider and every chart, table, metric, and analysis on the right panel recalculates instantly.

---

## 4. Scenario Presets (Bear / Base / Bull)

**Requirement:** Allow toggling assumptions to see impact. Scenario comparisons (Bear / Base / Bull).

**Status: Implemented**

**Description:**
Three pre-configured scenario presets are available at the top of the Input Panel. Selecting one loads a full set of inputs designed to represent that market condition.

| Scenario | Monthly Growth | Churn | COGS | Marketing | Payroll | Interpretation |
|---|---|---|---|---|---|---|
| Bear | 3% | 7% | 30% | $2,000 | $35,000 | Conservative / worst-case |
| Base | 8% | 3% | 22% | $4,000 | $35,000 | Moderate / realistic |
| Bull | 18% | 1.5% | 18% | $8,000 | $35,000 | Aggressive / best-case |
| Custom | User-set | User-set | User-set | User-set | User-set | Any user-defined configuration |

When a user modifies any slider after selecting a preset, the mode automatically switches to "Custom."

**Saving Custom Scenarios:** Users can name and save their current slider configuration as a custom scenario. Saved scenarios appear in the Scenarios tab where they can be reloaded or deleted.

**Effective Net Monthly Growth Under Each Preset:**

```
Bear effective growth = (1.03)(0.93) - 1 = -4.21%  [shrinking net]
Base effective growth = (1.08)(0.97) - 1 = +4.76%  [growing net]
Bull effective growth = (1.18)(0.985) - 1 = +16.23% [rapid growth]
```

The Bear scenario has a negative effective growth rate — revenue declines month over month. This is intentional and represents a stressed operating environment for stress-testing purposes.

---

## 5. Revenue & Expense Projections (Projection Tab)

**Requirement:** Monthly/annual revenue and expense projections. Profit estimates. Visualization of projected profit/loss.

**Status: Implemented**

**Description:**
The Projection tab is the main view. It contains three metric summary cards at the top, a visual chart, and a monthly breakdown table.

**Summary Metric Cards:**

- **Projected ARR (Annual Recurring Revenue):** The annualised revenue based on the final month of the forecast. Calculated as final-month MRR × 12. This is a standard investor-facing metric.
- **Net Profit (Final Month):** The bottom-line profit or loss in the last month of the forecast. Displayed in green if profitable, red if still in loss.
- **Break-even Month:** The first month in which cumulative profit turns positive. Shown in gold when found, red if break-even is not reached within the forecast window.

**Revenue vs Expenses vs Profit Chart:**

The chart plots three lines across the forecast period:
- Gold line — Projected Revenue
- Red line — Total Projected Expenses (COGS + Marketing + Payroll)
- Green shaded area — Net Profit (gap between revenue and expenses)

When the backend is connected, the chart also overlays:
- A grey historical revenue line (actual past performance)
- A dashed blue Prophet AI baseline forecast (trend extrapolated from historical data)
- A vertical "Today" divider separating historical from forward-looking data

**Monthly Breakdown Table:**

A tabular view showing Month 1 through Month 6 with columns for Revenue, Expenses, Gross Margin %, and Net Profit. For projections beyond 6 months, a note is shown indicating the remaining months are available in the full export.

**Underlying Equations:**

```
R(t) = R(t-1) × (1 + g) × (1 - c)          [Monthly Revenue]
TotalExp(t) = R(t) × (COGS%/100) + Marketing + Payroll
NetProfit(t) = R(t) - TotalExp(t)
ARR = R(N) × 12
```

See the Mathematical Foundations section above for the full derivation and expanded forms.

---

## 6. P&L Forecast (Profit & Loss Tab)

**Requirement:** P&L forecasts. Categories a financial document would include for industry standard.

**Status: Implemented**

**Description:**
The P&L tab presents a structured Profit & Loss view across the full forecast period.

**Summary Box (Top):**
- Total Revenue — Sum of all projected monthly revenues
- Total Expenses — Sum of all projected monthly expenses
- Average Gross Margin % — Average margin percentage across all months
- Net Profit / Loss — Total bottom-line result for the entire forecast period

**Underlying Equations:**

```
TotalRevenue    = Σ R(t)                     for t = 1..N
TotalExpenses   = Σ TotalExp(t)              for t = 1..N
TotalNetProfit  = Σ NetProfit(t)             for t = 1..N
AvgGrossMargin% = (1/N) × Σ [(R(t) - COGS(t)) / R(t) × 100]
```

**Month-by-Month P&L Bars:**
Each month is shown with a horizontal bar representing its profit margin percentage. Bars are green for profitable months and red for months still in loss. This gives an immediate visual read of when the business transitions from loss to profitability.

---

## 7. Scenario Comparison (Scenarios Tab)

**Requirement:** Scenario comparisons. Allow toggling assumptions to see impact.

**Status: Implemented**

**Description:**
The Scenarios tab displays all three built-in scenarios (Bear, Base, Bull) as side-by-side cards, each showing their projected financial outcomes. This allows the user to compare across scenarios without switching back and forth.

Each scenario card shows:
- Projected ARR at end of forecast
- Break-even month
- Final month net profit
- Growth rate and churn rate

Below the built-in scenarios, any custom scenarios the user has saved are displayed in the same card format. Each custom scenario card has a "Load into sliders" button that restores those exact input values to the dashboard for further analysis.

---

## 8. Cash Runway & Break-even Analysis (Cash Runway Tab)

**Requirement:** Break-even analysis. Cash runway visualization.

**Status: Implemented**

**Description:**
The Cash Runway tab focuses entirely on when and how the business reaches profitability.

**Break-even Visual Bar:**
A progress bar spanning the full forecast period, filled up to the break-even month. The bar fills in gold when break-even is reached, and red if it is not achieved within the forecast window. The exact break-even month is labelled on the bar.

**Cumulative Profit Trajectory:**
Each month of the forecast is displayed as a numbered box showing the running total of cumulative profit. Boxes are red while the business is still in a cumulative loss position and turn green once cumulative profit goes positive. This gives the user a clear picture of the path to break-even and how quickly the business recovers its initial losses.

**Underlying Equations:**

```
CumulativeProfit(t) = Σ NetProfit(i)    for i = 1..t

Break-even Month = min { t ∈ [1, N] : CumulativeProfit(t) ≥ 0 }
                 = "Not reached"  if no such t exists

Cash Runway Bar width % = (Break-even Month / N) × 100
```

**Contextual Guidance:**
The system provides a plain-English summary of the break-even result:
- Break-even in months 1–3: "very early — strong unit economics"
- Break-even in months 4–6: "early — within 6 months"
- Break-even after 6 months: "within forecast window"
- No break-even reached: warning message displayed

---

## 9. ARR Sensitivity Analysis (Sensitivity Tab)

**Requirement:** Sensitivity charts. What-if scenarios across multiple variables.

**Status: Implemented**

**Description:**
The Sensitivity tab presents a matrix table that shows how the Projected ARR changes across a range of growth rate and churn rate combinations simultaneously. This allows users to answer questions like "what happens to my ARR if growth drops 2% but churn also improves by 1%?"

**How to Read the Table:**
- Rows represent growth rate variations (from 4% below the current setting to 4% above)
- Columns represent churn rate variations (from 2% below current to 2% above)
- Each cell shows the projected ARR for that specific combination
- The current scenario is highlighted in gold
- Cells showing improvement vs the current scenario are highlighted green; worse outcomes are highlighted red

**Underlying Equations:**

```
ARR_cell(g', c') = MRR₀ × [(1 + g') × (1 - c')]^N × 12

g' ∈ { g-0.04, g-0.02, g, g+0.02, g+0.04 }
c' ∈ { c-0.02, c-0.01, c, c+0.01, c+0.02 }

ΔARR = ARR_cell(g', c') - ARR_cell(g, c)
  ΔARR > 0  → green
  ΔARR < 0  → red
  ΔARR = 0  → gold (current)
```

---

## 10. AI-Assisted Insights (ELLY Hint Block)

**Requirement:** AI-assist to suggest baseline growth assumptions or warn if projections seem unrealistic.

**Status: Implemented**

**Description:**
The Input Panel includes a contextual insight block labelled with the ELLY assistant branding. As the user adjusts sliders, the hint block updates with relevant guidance based on the current input values.

**Examples of Hints Provided:**
- If the monthly growth rate exceeds 15%: warns the user that this is an ambitious target and recommends validating with at least two months of real data before presenting to investors.
- If churn rate exceeds 5%: flags that churn is actively offsetting growth and suggests reviewing retention strategies.
- If growth is between 6–12% and churn is below 3%: confirms that the configuration looks reasonable for an early-stage SaaS business with well-controlled churn.

**Threshold Logic (Rule Engine):**

```
IF   g > 0.15                        → "Ambitious growth — validate with data"
ELIF c > 0.05                        → "Churn offsetting growth — review retention"
ELIF 0.06 ≤ g ≤ 0.12 AND c ≤ 0.03   → "Looks reasonable for early-stage SaaS"
ELSE                                 → "Review acquisition channels"

Where g = growthRate / 100, c = churnRate / 100
```

The effective growth being cancelled by churn can also be expressed as the **Growth-Churn Ratio**:

```
GCR = g / c

GCR > 3   → Growth dominates, healthy trajectory
GCR 1–3   → Growth and churn are competing, needs monitoring
GCR < 1   → Churn exceeds effective new revenue, business is shrinking
```

---

## 11. Prophet AI Forecasting (Backend Integration)

**Requirement:** Use Python forecasting libraries (Prophet/Darts) to extrapolate trends from historical data. Display historical vs AI baseline vs user-adjusted forecast.

**Status: Implemented**

**Description:**
When the backend server is running, the dashboard connects to a Prophet-powered forecasting endpoint. The system sends the current slider values to the backend, which returns three data series:

1. **Historical data** — actual past revenue and expense figures loaded from the reference dataset
2. **Prophet baseline forecast** — a trend-extrapolated forecast generated by the Prophet algorithm based purely on historical patterns, with upper and lower confidence bands
3. **Slider forecast** — the user's custom projection based on the slider inputs

All three series are overlaid on the Projection tab chart simultaneously, allowing the user to visually compare the AI-suggested baseline against their own manually adjusted assumptions.

When the backend is not connected, the dashboard automatically falls back to local calculations and continues to function fully using the slider values alone.

**Prophet Decomposition Model:**

```
y(t) = T(t) + S(t) + H(t) + ε(t)

Where:
  T(t) = Piecewise linear trend
  S(t) = Fourier-series seasonality
  H(t) = Holiday/event effect
  ε(t) ~ N(0, σ²)  [normally distributed noise]

Forecast interval:
  ŷ(t)    = T̂(t) + Ŝ(t)
  Lower   = ŷ(t) - 1.28σ   [80% lower bound]
  Upper   = ŷ(t) + 1.28σ   [80% upper bound]
```

---

## 12. Financial Calculation Engine

**Requirement:** Forecast outputs — individual forecasts per line item (Revenue, COGS, Expenses). Derived summary outputs (Gross Profit, Net Profit). Break-even point.

**Status: Implemented**

**Description:**
All projections are calculated by a dedicated calculation library built into the frontend. This ensures the dashboard responds instantly to every slider change without waiting for a server response.

**What Is Calculated:**

| Output | Formula |
|---|---|
| Monthly Revenue | `R(t) = R(t-1) × (1 + g) × (1 - c)` |
| COGS | `COGS(t) = R(t) × (COGS% / 100)` |
| Gross Profit | `GP(t) = R(t) - COGS(t)` |
| Gross Margin % | `GM%(t) = GP(t) / R(t) × 100` |
| Total Expenses | `TotalExp(t) = COGS(t) + Marketing + Payroll` |
| Net Profit | `NetProfit(t) = R(t) - TotalExp(t)` |
| Cumulative Profit | `CumProfit(t) = Σ NetProfit(i), i=1..t` |
| Break-even Month | `min { t : CumProfit(t) ≥ 0 }` |
| Projected ARR | `ARR = R(N) × 12` |
| Effective Net Growth | `g_net = (1 + g)(1 - c) - 1` |

---

## Summary of Requirements vs. Implementation

| Requirement | Status |
|---|---|
| User-defined growth rate inputs | Implemented |
| Cost driver inputs (COGS %, marketing, payroll) | Implemented |
| Monthly revenue projections | Implemented |
| Annual revenue projections (ARR) | Implemented |
| Expense projections | Implemented |
| Profit estimates | Implemented |
| Break-even analysis | Implemented |
| P&L Forecast view | Implemented |
| Bear / Base / Bull scenario comparison | Implemented |
| Custom scenario save and reload | Implemented |
| Sensitivity analysis (growth vs churn matrix) | Implemented |
| Cash runway visualization | Implemented |
| Revenue vs Expenses vs Profit chart | Implemented |
| Prophet AI baseline forecast overlay | Implemented |
| Historical vs projected data on chart | Implemented |
| AI-assisted input guidance (ELLY hints) | Implemented |
| Onboarding flow to collect baseline inputs | Implemented |
| Real-time recalculation on slider change | Implemented |

---

*Document prepared by the ElectraWireless development team.*
