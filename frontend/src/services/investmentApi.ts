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
    totalCost:   number;
    cashBalance: number;
  };
  holdings: Array<{
    symbol:        string;
    asset_type:    string;
    quantity:      number;
    buy_price:     number;
    purchase_date: string;
    costBasis:     number;
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
): InvestmentAIRequest {
  const cashBalance = holdings
    .filter((h) => h.asset_type === ("cash" as AssetType))
    .reduce((s, h) => s + h.quantity * h.buy_price, 0);

  const totalCost = holdings.reduce((s, h) => s + h.quantity * h.buy_price, 0);

  return {
    question,
    Goals:  goals,
    period,
    summary: { totalCost, cashBalance },
    holdings: holdings.map((h) => ({
      symbol:        h.symbol,
      asset_type:    h.asset_type,
      quantity:      h.quantity,
      buy_price:     h.buy_price,
      purchase_date: h.purchase_date,
      costBasis:     h.quantity * h.buy_price,
    })),
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
