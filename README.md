# ORI Finance Pro
Premium Arabic Financial Management PWA

## Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file with:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Deploy to Netlify

1. Connect your repository to Netlify
2. Set the environment variables in Netlify dashboard
3. Deploy!

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
- Vite 6
- TailwindCSS v4
- Zustand (State Management)
- Supabase (Backend + Auth + Realtime)
- Dexie.js (Offline Storage)
- Recharts (Charts)
- React Router v7
- PWA via vite-plugin-pwa

## License

MIT