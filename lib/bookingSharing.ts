import { PriceBookService } from './types';

/** Compact booking-page payload for URL sharing (no backend needed) */
export interface ShareableBookingData {
  /** business name */
  bn: string;
  /** services: [name, price][] */
  sv: [string, number][];
  /** business phone (optional) */
  ph?: string;
  /** business email (optional) */
  em?: string;
}

export const SHARE_BASE_URL = 'https://jobrun.app';

export function buildShareableBookingData(
  services: PriceBookService[],
  businessName: string,
  businessPhone?: string,
  businessEmail?: string,
): ShareableBookingData {
  return {
    bn: businessName,
    sv: services.filter((s) => s.isActive).map((s) => [s.name, s.price]),
    ph: businessPhone || undefined,
    em: businessEmail || undefined,
  };
}

export function encodeBookingData(data: ShareableBookingData): string {
  const json = JSON.stringify(data);
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return encodeURIComponent(base64);
}

export function decodeBookingData(encoded: string): ShareableBookingData | null {
  try {
    const base64 = decodeURIComponent(encoded);
    const json = decodeURIComponent(escape(atob(base64)));
    return JSON.parse(json) as ShareableBookingData;
  } catch {
    return null;
  }
}

export function buildBookingUrl(
  operatorId: string,
  services: PriceBookService[],
  businessName: string,
  businessPhone?: string,
  businessEmail?: string,
): string {
  const data = buildShareableBookingData(services, businessName, businessPhone, businessEmail);
  const encoded = encodeBookingData(data);
  return `${SHARE_BASE_URL}/book/${operatorId}?d=${encoded}`;
}
