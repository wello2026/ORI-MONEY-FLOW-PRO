# ORI Finance Pro
Premium Arabic financial operations ERP/PWA backed by Supabase.

## Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn
- Supabase project

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file with:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
```

### Database

Apply the canonical rescue migration:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

The migration in `supabase/migrations/20260512170000_ori_rescue_baseline.sql` creates the tables, policies, triggers, RPC functions, starter company, starter accounts, and user bootstrap flow. No manual profile/company SQL is required after it runs.

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Deploy to Cloudflare Pages

1. Connect the GitHub repository to Cloudflare Pages
2. Build command: `npm run build`
3. Build output directory: `dist`
4. Set the `VITE_*` environment variables

## Features

- 🔐 Authentication & Role-based Access
- 💰 Account & Cashbox Management
- 📊 Dashboard with Charts
- 👥 Employee Management
- 💳 Transaction System
- 🔄 Inter-account Transfers
- ✅ Approval Workflow
- 📈 Real-time Updates
- 📑 Reports & Export
- 📋 Audit Logs
- 📱 PWA Support
- 🌙 Dark Mode
- 🇸🇦 RTL Arabic Interface

## Tech Stack

- React 19 + TypeScript
- Vite 8
- TailwindCSS v4
- Zustand (State Management)
- Supabase (Backend + Auth + Realtime)
- Dexie.js (Offline Storage)
- Recharts (Charts)
- React Router v7
- PWA via vite-plugin-pwa

## License

MIT
