import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Customer, Job, Invoice } from './types';

function escapeCsv(value: string | number | undefined | null): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: (string | number | undefined | null)[][]): string {
  const headerLine = headers.map(escapeCsv).join(',');
  const dataLines = rows.map((row) => row.map(escapeCsv).join(','));
  return [headerLine, ...dataLines].join('\n');
}

export function customersToCSV(customers: Customer[]): string {
  return toCsv(
    ['First Name', 'Last Name', 'Email', 'Phone', 'Address', 'City', 'State', 'Zip', 'Notes', 'Created'],
    customers.map((c) => [
      c.firstName, c.lastName, c.email, c.phone, c.address, c.city, c.state, c.zip, c.notes, c.createdAt.split('T')[0],
    ])
  );
}

export function jobsToCSV(jobs: Job[], customerMap: Record<string, string>): string {
  return toCsv(
    ['Title', 'Customer', 'Status', 'Scheduled Date', 'Scheduled Time', 'Duration (min)', 'Total', 'Notes', 'Created'],
    jobs.map((j) => [
      j.title, customerMap[j.customerId] || '', j.status, j.scheduledDate, j.scheduledTime, j.estimatedDuration, j.total, j.notes, j.createdAt.split('T')[0],
    ])
  );
}

export function invoicesToCSV(invoices: Invoice[], customerMap: Record<string, string>): string {
  return toCsv(
    ['Invoice #', 'Customer', 'Status', 'Subtotal', 'Tax Rate', 'Tax Amount', 'Total', 'Due Date', 'Paid At', 'Payment Terms', 'Notes', 'Created'],
    invoices.map((i) => [
      i.invoiceNumber, customerMap[i.customerId] || '', i.status, i.subtotal, i.taxRate, i.taxAmount, i.total, i.dueDate, i.paidAt?.split('T')[0], i.paymentTerms, i.notes, i.createdAt.split('T')[0],
    ])
  );
}

export async function shareCSV(csv: string, filename: string): Promise<void> {
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: `Export ${filename}` });
}
