import axios, { AxiosError } from "axios";

/** Pull a human-readable message out of an axios/network error, falling back to a default. */
export function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const detail = (err as AxiosError<{ detail?: string }>).response?.data?.detail;
    if (detail) return detail;
    return err.message;
  }
  return err instanceof Error ? err.message : fallback;
}
