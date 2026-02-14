# JobRun

**Book jobs. Send invoices. Get paid.** — Built for solo operators.

JobRun is a field service management app designed for one-person service businesses: pressure washers, auto detailers, lawn care operators, cleaners, and handymen. Manage your customers, schedule jobs, send estimates, generate invoices, and collect payments — all from your phone.

## Architecture

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Mobile App** | Expo (React Native) + Expo Router | iOS & Android app |
| **Marketing Site** | Next.js + Tailwind CSS | Landing page, waitlist, customer-facing pages |
| **Backend** | Supabase | Auth, database, real-time sync, file storage |
| **Payments** | Stripe Connect | Payment processing with platform fee |
| **Notifications** | Twilio | SMS appointment reminders |

## Getting Started

### Prerequisites

- Node.js 22+
- npm
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- iOS Simulator or Android Emulator (or Expo Go on your phone)

### Install & Run — Mobile App

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `i` for iOS simulator / `a` for Android emulator.

### Install & Run — Marketing Website

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
/
├── app/                    # Expo Router screens
│   ├── (tabs)/             # Tab navigator
│   │   ├── index.tsx       # Today view (home)
│   │   ├── calendar.tsx    # Calendar/schedule
│   │   ├── customers.tsx   # Customer list
│   │   └── more.tsx        # Settings & reports
│   ├── job/[id].tsx        # Job detail
│   ├── customer/[id].tsx   # Customer detail
│   ├── estimate/[id].tsx   # Estimate detail
│   └── invoice/[id].tsx    # Invoice detail
├── components/             # Shared UI components
├── constants/
│   └── verticals.ts        # Industry vertical configs
├── lib/
│   ├── types.ts            # TypeScript types
│   ├── db.ts               # Local database (placeholder)
│   └── supabase.ts         # Supabase client (placeholder)
├── web/                    # Next.js marketing site
│   └── app/
│       ├── page.tsx        # Landing page
│       ├── privacy/        # Privacy policy
│       └── terms/          # Terms of service
└── .github/workflows/
    └── ci.yml              # CI pipeline
```

## Industry Verticals

JobRun ships with pre-configured service templates for:

- 💦 **Pressure Washing** — driveway, house wash, deck/patio, roof, gutters
- 🚗 **Auto Detailing** — exterior, interior, full detail, ceramic coating
- 🌿 **Lawn Care** — mowing, edging, leaf cleanup, mulching, aeration
- 🧹 **Cleaning Services** — standard, deep clean, move-in/out, post-construction
- 🔧 **Handyman** — hourly rate, fixture install, repairs, assembly, painting

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

**Git config:**

```bash
git config user.email "kris@kocan.com"
```

## License

MIT
