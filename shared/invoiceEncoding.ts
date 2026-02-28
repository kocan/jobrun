import { ShareableInvoiceData } from './types';

export function encodeInvoiceData(data: ShareableInvoiceData): string {
  const json = JSON.stringify(data);
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return encodeURIComponent(base64);
}

export function decodeInvoiceData(encoded: string): ShareableInvoiceData | null {
  try {
    const base64 = decodeURIComponent(encoded);
    const json = decodeURIComponent(escape(atob(base64)));
    return JSON.parse(json) as ShareableInvoiceData;
  } catch {
    return null;
  }
}
