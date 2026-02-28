import { getDatabase } from '../database';
import { CustomerNoteRow } from '../types';
import { CustomerNote } from '../../types';

function rowToNote(row: CustomerNoteRow): CustomerNote {
  return {
    id: row.id,
    customerId: row.customer_id,
    noteText: row.note_text,
    createdAt: row.created_at,
  };
}

export function getNotesByCustomer(customerId: string): CustomerNote[] {
  const db = getDatabase();
  const rows = db.getAllSync<CustomerNoteRow>(
    'SELECT * FROM customer_notes WHERE customer_id = ? ORDER BY created_at DESC',
    [customerId]
  );
  return rows.map(rowToNote);
}

export function addNote(note: CustomerNote): CustomerNote {
  const db = getDatabase();
  db.runSync(
    'INSERT INTO customer_notes (id, customer_id, note_text, created_at) VALUES (?,?,?,?)',
    [note.id, note.customerId, note.noteText, note.createdAt]
  );
  return note;
}

export function deleteNote(id: string): boolean {
  const db = getDatabase();
  const result = db.runSync('DELETE FROM customer_notes WHERE id = ?', [id]);
  return result.changes > 0;
}
