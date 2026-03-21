# FLIGHTDECK

A broker-to-underwriter aviation insurance placement platform built with React, TypeScript, Tailwind CSS, and Supabase.

## 🚀 Quick Start

**New to FLIGHTDECK?** Follow the [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed step-by-step instructions.

**Quick version:**
```bash
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
supabase functions deploy server
npm run dev
```

## Features

- **Placement Management**: Create and manage aviation insurance placements with status workflow (DRAFT → PENDING → QUOTED → FIRM ORDER → BOUND → DECLINED → NTU)
- **Product Support**: Hull & Spares (HL), Hull War (HW), Personal Accident (PA), Loss of License (LOL), Hull Deductible (HD), and UAS coverage
- **Lineslip Management**: Create and manage binding authority lineslips with authorized producing brokers
- **Contact Management**: Manage brokers, underwriters, insureds, cedents, and producing brokers
- **Document Generation**: Automated PDF generation for binding slips, EOC covering letters, and claims notification procedures
- **Email Notifications**: Branded HTML email notifications via Resend API at key status transitions
- **Reports & Analytics**: Dashboard with placement analytics, maps, and offer tracking

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- A Supabase account and project
- API keys for external services (optional):
  - JetAPI (aircraft registration lookups)
  - AeroDataBox (aircraft data)
  - ScoreChain (sanctions screening)
  - Resend (email notifications)

## Local Development Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd flightdeck
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Set up environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials and API keys:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@db.your-project-id.supabase.co:5432/postgres

# External API keys (optional)
JETAPI_KEY=your-jetapi-key-here
AERODATABOX_API_KEY=your-aerodatabox-key-here
SCORECHAIN_API_KEY=your-scorechain-key-here
RESEND_API_KEY=your-resend-key-here
```

### 4. Update Supabase info file

Edit `/utils/supabase/info.tsx` with your Supabase project details:

```typescript
export const projectId = "your-project-id";
export const publicAnonKey = "your-anon-key";
```

### 5. Deploy Supabase Edge Functions

The platform uses Supabase Edge Functions for the backend. Deploy them using the Supabase CLI:

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-id

# Deploy the edge function
supabase functions deploy server
```

Set environment variables for the edge function in your Supabase dashboard:
- Go to Project Settings → Edge Functions
- Add the environment variables listed in `.env.example`

### 6. Start the development server

```bash
npm run dev
```

The application will open at `http://localhost:3000`

## Project Structure

```
/
├── components/          # React components
│   ├── ui/             # Reusable UI components (shadcn/ui)
│   ├── PlacementForm.tsx
│   ├── PlacementDashboard.tsx
│   ├── LineslipForm.tsx
│   ├── ContactManager.tsx
│   └── ...
├── supabase/
│   └── functions/
│       └── server/     # Supabase Edge Functions
│           ├── index.tsx
│           ├── kv_store.tsx (protected)
│           ├── notifications.tsx
│           └── sanctions.tsx
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
├── styles/             # Global styles
└── App.tsx             # Main application component
```

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Design System

FLIGHTDECK uses a consistent design language:

- **Primary Color**: British Racing Green (`#004225`)
- **Font**: Inter
- **Backgrounds**: `bg-white`, `bg-gray-50`
- **Borders**: `border-gray-200`
- **Text Hierarchy**: `text-gray-900/700/500`

## Status Workflow

Placements follow this workflow:
1. **DRAFT** - Initial creation
2. **PENDING** - Submitted for review
3. **QUOTED** - Underwriter provides quote
4. **FIRM ORDER** - Broker confirms order
5. **BOUND** - Policy is bound (generates PDFs)
6. **DECLINED** - Underwriter declines
7. **NTU** - Not taken up

## Support

For issues or questions, please contact the development team.

## License

Proprietary - All rights reserved