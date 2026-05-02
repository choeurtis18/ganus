# Ganus — AI Interview Prep Platform

Plateforme IA de préparation aux entretiens pour étudiants français (stage, alternance, CDI). Production-ready, freemium.

**Stack**: Next.js 16.2.4 (App Router, Turbopack) · TypeScript · Supabase (Auth + Storage + PostgreSQL) · Prisma · OpenAI · next-intl · Tailwind CSS

**Status**: ✅ Production (v1.0.0) — Deployed on Vercel

---

## Quick Start

### Prérequis
- Node.js 20+
- Projet Supabase (supabase.com)
- Clé API OpenAI (gpt-4o-mini, gpt-4o)

### Local Setup

```bash
# 1. Clone & install
git clone <repo>
cd ganus
npm install

# 2. Environment variables
cp .env.example .env.local
# Remplir les variables (DATABASE_URL, OPENAI_API_KEY, SUPABASE_*, etc.)

# 3. Database
npm run migrate

# 4. Supabase Storage
# Dashboard Supabase → Storage → Create bucket "cvs" (Private)

# 5. Dev server
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## Commandes

```bash
npm run dev              # Serveur dev (Turbopack)
npm run build            # Build production
npm test                 # Tests Jest (16/16 pass)
npx tsc --noEmit         # Vérification TypeScript
npm run lint             # ESLint (0 warnings)
npm run migrate          # prisma db push
npm run db:studio        # Prisma Studio (dev only)
npm run db:generate      # Regenerate Prisma client
```

## Fonctionnalités

| Feature | Description | Status |
|---------|-------------|--------|
| **Auth** | Email/password via Supabase + password reset | ✅ |
| **Chat IA** | Entretiens simulés avec feedback scoring (2 LLM calls) | ✅ |
| **Profil** | Données perso + profil pro + postes cibles (autocomplete) | ✅ |
| **CV Analysis** | Upload PDF/IMG → extraction → analyse LLM (2/jour rate-limit) | ✅ |
| **Dashboard** | Stats, progression, conseils personnalisés | ✅ |
| **Reports** | Génération/régénération rapports par session | ✅ |
| **Onboarding** | 3 étapes (profil + CV + découverte) pour nouveaux users | ✅ |
| **Landing** | Page marketing publique (hero + features + CTA) | ✅ |
| **Admin** | Users, stats LLM, logs, stockage (protégé par secret) | ✅ |
| **i18n** | FR / EN via next-intl (routing par locale) | ✅ |
| **Dark Mode** | Persisté en localStorage + CSS vars | ✅ |

## Architecture

```
src/
  app/
    [locale]/                    ← Pages (FR/EN)
      (protected)/               ← Routes auth-requises
        chat/                    ← Interface entretien IA
        dashboard/               ← Stats & progression
        profile/                 ← Infos perso + CV + export RGPD
        onboarding/              ← Flux 3 étapes nouveaux users
      auth/
        login/                   ← Login + mot de passe oublié modal
        signup/
        reset-confirm/           ← Confirmation réinit mot de passe
      admin/                     ← Back-office (users, stats, logs)
    api/                         ← Routes API
  components/
    ui/                          ← Button, Input, Card, Badge, Icon, Avatar, Toast
    shell/                       ← AppShell (layout protégé)
    dashboard/                   ← StatCard, ScoreChart, TipsPanel
    cv/                          ← CVUploader, CVAnalysisDisplay
    admin/                       ← UserTable, LogsTable
    profile/                     ← ProfileForm, PostesInput
  i18n/                          ← Config next-intl
  lib/
    db.ts                        ← Prisma client
    supabase-server.ts           ← Server-side Supabase, syncUserToDB
    supabase-client.ts           ← Client-side Supabase
    llm.ts                       ← Chat LLM (streaming, hybrid flow)
    llm-cv.ts                    ← CV analysis LLM
    api-response.ts              ← successResponse, errorResponse
    profile-data.ts              ← Constantes (domaines, niveaux, postes)
    rate-limit.ts                ← Upstash Redis
    error-messages.ts            ← Error codes & translations
prisma/                          ← Schema DB
  schema.prisma
messages/                        ← Traductions
  fr.json
  en.json
.claude/                         ← Dev docs (CLAUDE.md, STATUS.md, etc.)
.github/workflows/               ← CI/CD GitHub Actions
```

**Patterns clés** — voir [.claude/CLAUDE.md](./.claude/CLAUDE.md) :
- **Auth** : `authUser.id` (UUID Supabase) ≠ `user.id` (CUID Prisma)
- **API routes** : auth → findUnique → rate-limit → logic → successResponse/errorResponse
- **LLM** : gpt-4o-mini (chat <10 msgs, scoring, CV) + gpt-4o (synthesis long)
- **Streaming** : `[FEEDBACK]{json}[/FEEDBACK]` + next question
- **Soft delete** : RGPD compliant (anonymize → soft delete Prisma + Auth)
- **Logout** : `window.location.href` (hard reload, évite race condition middleware)
- **Fetch client** : Always `.ok` check + `body?.data` pattern
- **i18n nav** : Import depuis `@/i18n/navigation` (pas `next/navigation`)

## Database

Modèles Prisma :
- **User** : profile + CV + chat sessions + LLM logs
- **ChatSession** : messages JSON + scoring breakdown
- **ChatReport** : rapport de session généré
- **ScoreBreakdown** : critères score (pertinence, clarté, exemples, profondeur, communication)
- **CVAnalysis** : historique analyses CV
- **LLMLog** : tracking coûts OpenAI

Relations & constraints :
- `@@unique([sessionId, messageIndex])` sur ScoreBreakdown
- Soft delete via `deletedAt` (jamais supprimer colonnes)
- Rate-limit : messages/heure (chat), analyses/jour (CV)

## Production Deployment (Vercel)

### Setup initial

1. **Connecter GitHub** → Vercel (auto-deploy sur `main`)
2. **Environment variables** (Settings → Environment Variables) :
   ```
   NODE_ENV=production
   NEXT_PUBLIC_APP_URL=https://ganus.vercel.app
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyxx...
   DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
   DIRECT_URL=postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
   SUPABASE_SERVICE_ROLE_KEY=eyxx...
   OPENAI_API_KEY=sk-proj-xx...
   ADMIN_SECRET=your-secret
   RATE_LIMIT_MESSAGES_PER_HOUR=10
   ```

3. **Supabase Configuration** :
   - Authentication → URL Configuration → Redirect URLs:
     ```
     http://localhost:3000/auth/callback
     https://ganus.vercel.app/auth/callback
     https://ganus.vercel.app/auth/reset-confirm
     ```
   - Storage → Create bucket `cvs` (Private)

### Critical: DATABASE_URL (Pooler)

⚠️ **Vercel serverless cannot use direct DB connections (port 5432)**

**Solution** : Use Supabase PgBouncer pooler (Transaction mode, port 6543)

Format :
```
postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

Find exact URL : Supabase Dashboard → Settings → Database → Connection Pooling → Transaction mode

### Redeploy after env changes

Environment variables are baked at build time. After updating:
1. Vercel Dashboard → Deployments → Latest → **Redeploy**
2. Or push a commit to trigger auto-deploy

## Features Detail

### Password Reset
- User clicks "Mot de passe oublié" → modal with email input
- Supabase sends reset email with secure link
- User clicks link → `/auth/reset-confirm` page
- Sets new password → redirected to login
- Server Action for secure env var access

### CV Analysis
- Upload PDF/JPG/PNG (max 5 MB)
- Extract text via `pdf-parse` lib
- Analyze with GPT-4o-mini
- Score (0-100) + strengths/improvements/suggestions
- Rate limit: 2 analyses per day
- Store history in `CVAnalysis` model

### Chat Scoring
Hybrid LLM flow:
- **< 10 messages** : Full history + gpt-4o-mini
- **≥ 10 messages** : Summarize (mini) → generate (gpt-4o, summary + 5 recent)
- Evaluate if wordCount ≥ 20 : Score 5 criteria (pertinence 30, clarté 20, exemples 20, profondeur 20, communication 10)
- Stream `[FEEDBACK]{json}[/FEEDBACK]` + next question

### Admin Panel
Protected by `ADMIN_SECRET` header:
- Users : list, change role, soft delete
- Stats : LLM costs (day/month/total), top users
- Logs : LLM calls with pagination
- Storage : Supabase bucket stats

## Tests & Quality

```bash
npm test              # Jest (16/16 pass)
  - auth-helpers.test.ts (7 tests)
  - rate-limit.test.ts (9 tests)

npx tsc --noEmit      # TypeScript (0 errors)
npm run lint          # ESLint (0 warnings)
npm run build         # Production build (success)
```

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) on every PR:
- `npx tsc --noEmit`
- `npm run lint`
- `npm test`

Must pass before merge.

## Development Tips

### Local Supabase (optional)
```bash
npx supabase start     # Run local Supabase (Docker required)
```

### Prisma Studio
```bash
npm run db:studio     # Interactive DB browser (localhost:5555)
```

### Debug LLM calls
Set `DEBUG=ganus:llm` to see streaming & tokens.

### Watch CSS vars
All colors via CSS custom properties (`:root` + `[data-theme="dark"]`). See `src/app/globals.css`.

## Contributing

See [.claude/CLAUDE.md](./.claude/CLAUDE.md) for code patterns, architecture, and dev guidelines.

Key rules:
- Max 300 lines per file
- API routes: always `successResponse` / `errorResponse` with `requestId`
- Client fetch: always `.ok` check before `.json()`
- Translations: add keys to both `messages/fr.json` and `messages/en.json`
- Git: meaningful commit messages, new commits (not amends)

## License

Proprietary (Ganus)

---

**Pour les étudiants français qui veulent décrocher leur entretien d'embauche** 🚀
