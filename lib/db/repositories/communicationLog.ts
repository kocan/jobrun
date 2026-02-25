import { getDatabase } from '../database';
import { CommunicationEntry, CommunicationType } from '../../types';

interface ComLogRow {
  id: string;
  customer_id: string;
  type: string;
  summary: string;
  notes: string | null;
  created_at: string;
}

function rowToEntry(row: ComLogRow): CommunicationEntry {
  return {
    id: row.id,
    customerId: row.customer_id,
    type: row.type as CommunicationType,
    summary: row.summary,
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

export function getEntriesByCustomer(customerId: string): CommunicationEntry[] {
  const db = getDatabase();
  const rows = db.getAllSync<ComLogRow>(
    'SELECT * FROM communication_log WHERE customer_id = ? ORDER BY created_at DESC',
    [customerId]
  );
  return rows.map(rowToEntry);
}

export function addEntry(entry: CommunicationEntry): CommunicationEntry {
  const db = getDatabase();
  db.runSync(
    'INSERT INTO communication_log (id, customer_id, type, summary, notes, created_at) VALUES (?,?,?,?,?,?)',
    [entry.id, entry.customerId, entry.type, entry.summary, entry.notes ?? null, entry.createdAt]
  );
  return entry;
}

export function deleteEntry(id: string): boolean {
  const db = getDatabase();
  const result = db.runSync('DELETE FROM communication_log WHERE id = ?', [id]);
  return result.changes > 0;
}
