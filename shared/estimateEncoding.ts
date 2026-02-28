import { ShareableEstimateData } from './types';

export function encodeEstimateData(data: ShareableEstimateData): string {
  const json = JSON.stringify(data);
  // Use btoa-compatible encoding (works in RN and web)
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return encodeURIComponent(base64);
}

export function decodeEstimateData(encoded: string): ShareableEstimateData | null {
  try {
    const base64 = decodeURIComponent(encoded);
    const json = decodeURIComponent(escape(atob(base64)));
    return JSON.parse(json) as ShareableEstimateData;
  } catch {
    return null;
  }
}
