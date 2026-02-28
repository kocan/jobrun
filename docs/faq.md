# JobRun FAQ & Troubleshooting

Answers to common questions about using JobRun to run your service business.

---

## Getting Started

**What is JobRun?**
JobRun is a mobile app that helps solo operators (pressure washers, landscapers, cleaners, detailers, handymen) book jobs, send invoices, and get paid — all from your phone.

**What do I need to get started?**
Just a smartphone. Download the app, pick your industry, enter your business name and contact info, and you're ready to go.

**Do I need an internet connection to use JobRun?**
No. JobRun works offline. Your data is saved on your phone first and syncs to the cloud when you're back online. See the [Offline & Sync](#offline--sync) section for details.

**Is JobRun free?**
The Free plan is free forever and includes up to 10 customers, basic scheduling, invoicing, and a price book. The Pro plan ($19/month) adds unlimited customers, online payments, estimates, SMS reminders, and more.

**How do I set up my business profile?**
When you first open the app, the onboarding screen walks you through it:
1. Pick your industry (Pressure Washing, Lawn Care, Cleaning, Auto Detailing, or Handyman).
2. Enter your business name.
3. Add your phone number and email.
4. Review your starter price book — you can change prices or add services anytime.

---

## Jobs & Scheduling

**How do I create a new job?**
Tap the **+** button from the Today or Calendar tab. Pick a customer (or add a new one), choose services from your price book, set a date and time, and save.

**What do the job statuses mean?**
- **Scheduled** — The job is booked and upcoming.
- **In Progress** — You've started working on the job.
- **Completed** — The job is finished.
- **Cancelled** — The job was called off.

**Can I add photos to a job?**
Yes. Open a job and use the photo section to attach before-and-after pictures. This is handy for showing work quality to customers.

**How do I reschedule a job?**
Open the job, tap the date or time, and pick a new one. The calendar view updates automatically.

**Can I see all my jobs for today?**
Yes. The **Today** tab shows today's jobs and tomorrow's upcoming work at a glance.

**My industry uses different words — can I change them?**
JobRun adjusts terminology to fit your industry. For example, pressure washers see "Wash" instead of "Job," and auto detailers see "Detail." This is set automatically when you pick your industry during setup.

---

## Estimates & Invoices

**What is the difference between an estimate and an invoice?**
- An **estimate** is a quote you send before doing the work. The customer can accept or decline it.
- An **invoice** is a bill you send after the work is done.

**How do I send an estimate or invoice to a customer?**
Tap **Share** on the estimate or invoice screen. JobRun creates a link you can send by text or email. Your customer opens the link in their phone's browser — no app download needed on their end.

**What do the estimate statuses mean?**
- **Draft** — You're still working on it.
- **Sent** — You've shared it with the customer.
- **Viewed** — The customer opened the link.
- **Accepted** — The customer agreed to the quote.
- **Declined** — The customer passed on the quote.
- **Expired** — The estimate is past its expiration date.

**Can I turn an estimate into an invoice?**
Yes. Once the job is done, you can create an invoice from a completed job with the same line items.

**How do I add tax to an invoice?**
In your settings, set your tax rate. JobRun calculates tax automatically on each invoice.

**Can I customize my services and prices?**
Yes. Go to **More > Price Book** to add, edit, or remove services. Each service can have a name, price, and description. When you create a job or estimate, you pick from your price book.

---

## Payments

**How do customers pay me?**
On the Pro plan, customers can pay online through a link on the invoice (powered by Stripe). You can also record cash, check, or other payment methods manually.

**How do I set up online payments?**
Go to **More > Settings** and connect your Stripe account. Once connected, every invoice you share will include a "Pay Now" option for your customer.

**How do I mark an invoice as paid?**
Open the invoice and tap **Record Payment**. Choose the payment method (cash, check, Stripe, or other) and confirm.

**When do I get my money from online payments?**
Online payments go through Stripe. Stripe typically deposits funds into your bank account in 1–2 business days. Check your Stripe dashboard for exact timing.

---

## Offline & Sync

**What happens when I lose cell service on a job site?**
Everything keeps working. JobRun saves all your data on your phone. Any changes you make offline are queued up and sync automatically when you get a connection again.

**How do I know if my data has synced?**
The app shows a sync status indicator. If you see a banner that says you're offline, your changes are saved locally and waiting to sync.

**Will I lose data if my phone dies while offline?**
No. Your data is stored in a local database on your phone. As long as you saved your changes, they're safe even if the app closes or your phone restarts.

**Do I have to do anything to trigger a sync?**
No. Syncing happens automatically in the background once you're back online. There's nothing you need to tap or configure.

---

## Data & Privacy

**Is my data safe?**
Yes. JobRun uses industry-standard encryption. Your customer lists and job history belong to you — we never sell your data.

**Can I export my data?**
Yes. Go to **More > Export Data** to download your customers, jobs, and invoices as CSV files. You can open these in Excel, Google Sheets, or any spreadsheet app.

**Can other people see my customer list?**
No. Your data is private to your account. JobRun does not share data between users.

**What happens to my data if I cancel my subscription?**
Your data stays on your phone. You drop back to the Free plan limits, but nothing is deleted.

**Does JobRun share my information with third parties?**
Only what's needed to provide the service (for example, Stripe processes payments, and Supabase hosts cloud sync). We never sell your personal or business data. See our Privacy Policy for full details.

---

## Troubleshooting

**The app says I'm offline, but I have Wi-Fi.**
- Make sure your Wi-Fi is actually connected to the internet (try loading a website in your browser).
- Toggle Wi-Fi off and on in your phone's settings.
- Close and reopen JobRun.

**My jobs aren't showing up on the calendar.**
- Check that the job has a scheduled date. Jobs without a date won't appear on the calendar.
- Pull down on the calendar screen to refresh.
- If you just created the job, give it a moment to save.

**I can't find a customer I added.**
- Use the search bar at the top of the Customers tab.
- Check for typos in the name when you added them.
- If you were offline when you added the customer, they're saved locally and will appear once the app syncs.

**My invoice link isn't working for my customer.**
- Make sure you copied the full link. Partial links won't load.
- Ask your customer to open the link in their default browser (not inside an app like Facebook or Instagram).
- Try sharing the link again from the invoice screen.

**The app is running slowly.**
- Close other apps running in the background.
- Make sure your phone's operating system is up to date.
- Restart the app by fully closing it and reopening.

**I'm not getting payment notifications.**
- Check that you've connected your Stripe account under **More > Settings**.
- Make sure notifications are enabled for JobRun in your phone's settings.
- Online payment notifications require an active internet connection.

**I accidentally deleted a customer or job.**
- If you haven't synced since the deletion, close the app immediately and contact support — we may be able to help recover it.
- Going forward, consider exporting your data regularly as a backup (**More > Export Data**).

**How do I contact support?**
Email us or visit our website for help. Pro plan members get priority support.
