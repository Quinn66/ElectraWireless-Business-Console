/**
 * Shared API constants and response types used across the frontend.
 * Import from here rather than hardcoding the base URL in individual files.
 */

export const API_BASE = "https://electrawireless-business-console.onrender.com";

/** Full response shape returned by POST /analyze */
export interface AnalysisResult {
  analysis_short:    string;
  analysis_detailed: string;
  positives:         string[];
  negatives:         string[];
  next_steps:        string[];
}
