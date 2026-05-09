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
