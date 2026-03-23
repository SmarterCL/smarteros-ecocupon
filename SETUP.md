# 🚀 EcoCupon Setup Guide

## Quick Start

### 1. Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Then set your Supabase credentials from the dashboard:
- **Project URL**: `https://supabase.com/dashboard/project/uyxvzztnsvfcqmgkrnol`
- **API Keys**: Go to **Settings → API** to get your keys

### 2. Database Setup

The database schema is defined in `scripts/setup-supabase.sql`.

**Execute via Supabase Dashboard:**
1. Go to: https://supabase.com/dashboard/project/uyxvzztnsvfcqmgkrnol/sql/new
2. Copy contents of `scripts/setup-supabase.sql`
3. Click **Run**

**Or via Supabase CLI:**
```bash
supabase link --project-ref uyxvzztnsvfcqmgkrnol
supabase db push
```

### 3. Install & Run

```bash
pnpm install
pnpm dev
```

Available at: http://localhost:3000

---

## MCP Configuration

The Supabase MCP is configured in `mcp.json` for IDE integration.

**To enable:**
1. Restart your IDE (Cursor)
2. The MCP server will connect automatically
3. Use `@supabase` in chat for database assistance

---

## Security

**Never commit secrets:**
- `.env.local` is gitignored
- Use Supabase Vault for sensitive data
- API keys should only be in environment variables

---

## Troubleshooting

### Error: "Could not find table"

Run the database setup SQL in the Supabase Dashboard.

### Port Already in Use

```bash
pnpm dev -- -p 3001
```

---

## Project Structure

```
├── app/                    # Next.js app directory
├── components/             # React components
├── lib/
│   ├── supabase/          # Supabase client
│   ├── database.types.ts  # TypeScript types
│   └── utils.ts           # Helpers
├── scripts/
│   └── setup-supabase.sql # Database schema
└── .env.local             # Environment (not in git)
```

---

**Developed with ❤️ in Chile 🇨🇱**
