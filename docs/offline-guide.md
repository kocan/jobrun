# Offline Behavior Guide

JobRun is built **local-first**: every screen, every action, and every piece of
data works without an internet connection. This guide explains how offline mode
works, what happens when you reconnect, and how your data stays safe.

---

## How Offline Works

JobRun stores all data in a **SQLite database on your device**. When you create
a customer, schedule a job, or send an invoice, that data is written directly to
on-device storage — not to a remote server. The network is never in the critical
path.

A background **sync queue** tracks which records have changed locally. When a
network connection is available and Supabase is configured, pending changes are
pushed to the cloud. If Supabase is not configured, the app runs in
**local-only mode** and everything still works.

### Network Detection

JobRun monitors connectivity using the device's network APIs. It checks both
that a connection exists _and_ that the internet is actually reachable. When
you go offline, a yellow banner appears at the top of the screen:

> **Offline — changes will sync when reconnected**

The banner disappears automatically when connectivity is restored.

---

## What Works Offline vs. Requires Connectivity

### Fully Available Offline

All core functionality works without any network connection:

- **Customers** — create, edit, search, and delete customers
- **Jobs** — schedule, update status, add line items, attach photos
- **Estimates** — create, edit, convert to jobs, and manage line items
- **Invoices** — create, edit, record payments, auto-number (INV-0001, …)
- **Price Book** — add, edit, reorder, and categorize services
- **Communication Log** — record calls, notes, and timeline entries
- **Reports & Export** — generate CSV exports of your data
- **Settings** — update business info, tax rates, and app preferences

### Requires Connectivity

- **Cloud sync** — pushing local changes to Supabase
- **Magic-link sign-in** — authenticating via email link (Supabase auth)
- **Multi-device access** — viewing data from another device requires a
  completed sync

---

## Sync Behavior When Reconnecting

### How the Sync Queue Works

Every time you create, update, or delete a record, JobRun marks it with a
`pending` sync status. These pending records form a queue that is processed
when a connection becomes available.

1. **You make a change** — the record is saved to SQLite immediately and
   flagged as `pending`.
2. **Connection restored** — the sync queue picks up all pending records.
3. **Upload to Supabase** — each record is pushed to the cloud.
4. **Marked as synced** — successfully uploaded records are updated to
   `synced` status.

### What Gets Synced

The following record types participate in sync:

| Record Type       | Synced |
| ----------------- | ------ |
| Customers         | Yes    |
| Jobs              | Yes    |
| Estimates         | Yes    |
| Invoices          | Yes    |
| Price Book Items  | Yes    |
| Communication Log | No (local only) |
| App Settings      | No (local only) |

### Deletions

JobRun uses **soft deletes**. When you delete a record, it is marked with a
`deleted_at` timestamp rather than being removed from the database. This means:

- Deleted records are hidden from the UI immediately.
- The deletion is synced to the cloud like any other change.
- No data is permanently lost until a future cleanup pass.

---

## Data Safety Guarantees

### Write-Ahead Logging (WAL)

SQLite is configured with **WAL mode**, which provides:

- **Crash safety** — committed writes survive app crashes and unexpected
  shutdowns. Changes are first written to a separate log file before being
  applied to the main database.
- **Concurrent reads** — the UI can read data while a write is in progress
  without blocking.

### Transactions

Multi-step operations are wrapped in **database transactions**. For example,
creating an invoice inserts the invoice header, its line items, and increments
the invoice counter all atomically — either everything succeeds or nothing
changes. This prevents partial writes.

### Foreign Key Integrity

Foreign keys are enforced at the database level. A job's line items cannot
exist without their parent job. If a job is deleted, its line items are
automatically removed via cascading deletes.

### Timestamps

Every record carries `created_at` and `updated_at` timestamps in ISO 8601
format. These are set automatically and enable conflict detection during sync.

### No Silent Data Loss

- All writes are **synchronous** — the operation completes before control
  returns to the app. There are no fire-and-forget writes.
- Pending changes persist in the local database until they are successfully
  synced. Closing the app, restarting your phone, or losing connectivity will
  not discard queued changes.

---

## Tips for Field Workers with Spotty Signal

### Before Heading Out

- **Open the app once on Wi-Fi.** This ensures the database is initialized and
  any pending syncs from previous sessions are completed.
- **Verify your data is loaded.** Scroll through your customer list and
  upcoming jobs so the data is cached locally.

### While in the Field

- **Work normally.** You do not need to wait for signal to create jobs, log
  notes, or generate invoices. Everything saves locally.
- **Don't worry about the offline banner.** It is informational. Your work is
  saved to the device the moment you tap Save.
- **Batch your work.** If you have brief moments of connectivity, the app will
  automatically start syncing pending changes — no action required on your part.

### Back on Reliable Wi-Fi

- **Open the app and let it sit for a moment.** The sync queue will process any
  accumulated changes automatically.
- **Check the sync indicator.** Once all pending records have been uploaded, your
  data is safely in the cloud and accessible from other devices.

### General Advice

- **Keep the app updated.** Updates may include improvements to sync reliability
  and database performance.
- **Don't clear app data.** Your local database _is_ your data. Clearing storage
  or reinstalling the app without syncing first will lose unsynced changes.
- **One device at a time.** If you work from multiple devices, let each device
  fully sync before switching to avoid conflicting edits.
