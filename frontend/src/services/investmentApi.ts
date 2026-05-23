import axios from "axios";

const BASE_URL =
  ((import.meta as unknown) as { env: Record<string, string> }).env
    .VITE_API_URL ?? "http://localhost:8000";

export const investmentApiClient = axios.create({ baseURL: BASE_URL });

export type AssetType = "stock" | "crypto" | "etf" | "fund" | "real_estate";

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  stock:       "Stock",
  crypto:      "Crypto",
  etf:         "ETF",
  fund:        "Fund",
  real_estate: "Real Estate",
};

export interface InvestmentHolding {
  id:            string;
  user_id:       string;
  symbol:        string;
  asset_type:    AssetType;
  quantity:      number;
  buy_price:     number;
  purchase_date: string;
  source:        "manual" | "csv";
  created_at:    string;
}

export interface NewHolding {
  symbol:        string;
  asset_type:    AssetType;
  quantity:      number;
  buy_price:     number;
  purchase_date: string;
}

export async function fetchHoldings(): Promise<InvestmentHolding[]> {
  const res = await investmentApiClient.get<InvestmentHolding[]>("/investments/holdings");
  return res.data;
}

export async function addHolding(data: NewHolding): Promise<InvestmentHolding> {
  const res = await investmentApiClient.post<InvestmentHolding>("/investments/holdings", data);
  return res.data;
}

export async function deleteHolding(id: string): Promise<void> {
  await investmentApiClient.delete(`/investments/holdings/${id}`);
}

export async function clearAllHoldings(): Promise<void> {
  await investmentApiClient.delete("/investments/holdings");
}

export interface InvestmentInsight {
  type: string;
  message: string;
  severity: "high" | "medium" | "low" | "info";
  affected: string[];
}

export async function fetchInsights(): Promise<InvestmentInsight[]> {
  const res = await investmentApiClient.get<InvestmentInsight[]>("/investments/insights");
  return res.data;
}

export interface InvestmentOnboardingPayload {
  age:                 number;
  experienceLevel:     "beginner" | "intermediate" | "advanced";
  financialBackground: "low" | "moderate" | "high";
  communicationStyle:  "simple" | "technical";
  investmentGoal:      "growth" | "income" | "preservation" | "balanced";
  timeHorizon:         "short" | "medium" | "long";
}

export async function submitInvestmentOnboarding(
  payload: InvestmentOnboardingPayload
): Promise<void> {
  await investmentApiClient.post("/investments/onboarding", payload);
}

export interface MarketPrice {
  symbol: string;
  current_price: number | null;
  daily_change: number | null;
  percentage_change: number | null;
  timestamp: string;
}

export interface AssetPerformance {
  id: number;
  symbol: string;
  asset_type: AssetType;
  quantity: number;
  buy_price: number;
  current_price: number;
  cost_basis: number;
  current_value: number;
  profit_loss: number;
  return_percentage: number;
  cagr: number | null;
  annualised_volatility: number | null;
  daily_change: number | null;
  percentage_change: number | null;
}

export interface PortfolioSummary {
  total_value: number;
  total_cost: number;
  profit_loss: number;
  return_percentage: number;
  holding_count: number;
  assets: AssetPerformance[];
  diversification: {
    score: number;
    distinct_asset_types: string[];
    overexposed_holdings: Array<{ id: number; symbol: string; asset_type: string; percentage: number }>;
    overexposed_types: Array<{ asset_type: string; percentage: number }>;
  };
}

export interface PortfolioSnapshot {
  date: string;
  total_value: number;
  profit_loss: number;
  return_percentage: number;
}

export interface MarkowitzPoint {
  symbol: string;
  asset_type: string;
  risk: number | null;
  ret: number | null;
  value: number;
}

export async function fetchPrices(): Promise<MarketPrice[]> {
  const res = await investmentApiClient.get<MarketPrice[]>("/investments/prices");
  return res.data;
}

export async function fetchSummary(): Promise<PortfolioSummary> {
  const res = await investmentApiClient.get<PortfolioSummary>("/investments/summary");
  return res.data;
}

export async function fetchSnapshots(): Promise<PortfolioSnapshot[]> {
  const res = await investmentApiClient.get<PortfolioSnapshot[]>("/investments/snapshots");
  return res.data;
}

export async function fetchMarkowitz(): Promise<MarkowitzPoint[]> {
  const res = await investmentApiClient.get<MarkowitzPoint[]>("/investments/markowitz");
  return res.data;
}

export interface MarketMover {
  symbol:            string;
  current_price:     number;
  daily_change:      number;
  percentage_change: number;
}

export interface MarketMovers {
  gainers: MarketMover[];
  losers:  MarketMover[];
}

export async function fetchMarketMovers(): Promise<MarketMovers> {
  const res = await investmentApiClient.get<MarketMovers>("/investments/market-movers");
  return res.data;
}

export async function deleteAllHoldings(): Promise<void> {
  await investmentApiClient.delete("/investments/holdings");
}

export async function uploadHoldingsCsv(
  file: File
): Promise<{ imported: number; symbols: string[]; errors: string[] }> {
  const form = new FormData();
  form.append("file", file);
  const res = await investmentApiClient.post<{
    imported: number;
    symbols: string[];
    errors: string[];
  }>("/investments/holdings/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

// ── AI Insights (portfolio analysis via Llama) ────────────────────────────────

export interface InvestmentAIResponse {
  summary:           string;
  pros:              string[];
  cons:              string[];
  next_steps:        string[];
  question_response: string;
  sources:           string[];
}

export interface InvestmentAIRequest {
  question: string;
  Goals:    string;
  period:   string;
  summary: {
    totalCost:         number;
    cashBalance:       number;
    totalCurrentValue: number | null;
    totalPnL:          number | null;
    totalReturnPct:    number | null;
  };
  holdings: Array<{
    symbol:            string;
    asset_type:        string;
    quantity:          number;
    buy_price:         number;
    purchase_date:     string;
    costBasis:         number;
    current_price:     number | null;
    current_value:     number | null;
    profit_loss:       number | null;
    return_percentage: number | null;
  }>;
  onboarding: {
    available:           boolean;
    age:                 number;
    experienceLevel:     string;
    financialBackground: string;
    communicationStyle:  string;
    investmentGoal:      string;
    timeHorizon:         string;
  };
}

export function buildInvestmentAIPayload(
  question:   string,
  holdings:   InvestmentHolding[],
  onboarding: InvestmentOnboardingPayload,
  goals:      string = "",
  period:     string = "Current portfolio",
  summary:    PortfolioSummary | null = null,
): InvestmentAIRequest {
  const cashBalance = holdings
    .filter((h) => h.asset_type === ("cash" as AssetType))
    .reduce((s, h) => s + h.quantity * h.buy_price, 0);

  const totalCost = holdings.reduce((s, h) => s + h.quantity * h.buy_price, 0);

  const perfMap = new Map<string, AssetPerformance>();
  if (summary) {
    for (const a of summary.assets) {
      perfMap.set(a.symbol.toUpperCase(), a);
    }
  }

  return {
    question,
    Goals:  goals,
    period,
    summary: {
      totalCost,
      cashBalance,
      totalCurrentValue: summary?.total_value ?? null,
      totalPnL:          summary?.profit_loss ?? null,
      totalReturnPct:    summary?.return_percentage ?? null,
    },
    holdings: holdings.map((h) => {
      const perf = perfMap.get(h.symbol.toUpperCase());
      return {
        symbol:            h.symbol,
        asset_type:        h.asset_type,
        quantity:          h.quantity,
        buy_price:         h.buy_price,
        purchase_date:     h.purchase_date,
        costBasis:         h.quantity * h.buy_price,
        current_price:     perf?.current_price ?? null,
        current_value:     perf?.current_value ?? null,
        profit_loss:       perf?.profit_loss ?? null,
        return_percentage: perf?.return_percentage ?? null,
      };
    }),
    onboarding: {
      available:           true,
      age:                 onboarding.age,
      experienceLevel:     onboarding.experienceLevel,
      financialBackground: onboarding.financialBackground,
      communicationStyle:  onboarding.communicationStyle,
      investmentGoal:      onboarding.investmentGoal,
      timeHorizon:         onboarding.timeHorizon,
    },
  };
}

export async function fetchInvestmentAIInsights(
  payload: InvestmentAIRequest,
): Promise<InvestmentAIResponse> {
  const res = await investmentApiClient.post<InvestmentAIResponse>(
    "/pf/portfolio-analysis",
    { data: payload },
  );
  return res.data;
}

// ── Forecast Config persistence ───────────────────────────────────────────────

export interface ForecastConfigPayload {
  starting_mrr:    number;
  growth_rate:     number;
  churn_rate:      number;
  cogs_percent:    number;
  marketing_spend: number;
  payroll:         number;
  months:          number;
  user_id?:        string;
}

export async function saveForecastConfig(config: ForecastConfigPayload): Promise<void> {
  await investmentApiClient.post("/forecast/config", { ...config, user_id: "demo-user" });
}

export async function loadForecastConfig(): Promise<ForecastConfigPayload | null> {
  try {
    const res = await investmentApiClient.get<ForecastConfigPayload>("/forecast/config/demo-user");
    return res.data;
  } catch {
    return null;
  }
}

// ── Investment Onboarding persistence ─────────────────────────────────────────

export async function loadInvestmentOnboarding(): Promise<InvestmentOnboardingPayload | null> {
  try {
    const res = await investmentApiClient.get<{
      age:                  number;
      experience_level:     string;
      financial_background: string;
      communication_style:  string;
      investment_goal:      string;
      time_horizon:         string;
    }>("/investments/onboarding/demo-user");
    const d = res.data;
    return {
      age:                 d.age,
      experienceLevel:     d.experience_level     as InvestmentOnboardingPayload["experienceLevel"],
      financialBackground: d.financial_background as InvestmentOnboardingPayload["financialBackground"],
      communicationStyle:  d.communication_style  as InvestmentOnboardingPayload["communicationStyle"],
      investmentGoal:      d.investment_goal      as InvestmentOnboardingPayload["investmentGoal"],
      timeHorizon:         d.time_horizon         as InvestmentOnboardingPayload["timeHorizon"],
    };
  } catch {
    return null;
  }
}
