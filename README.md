# Ganus — AI Interview Prep Platform

Plateforme IA de préparation aux entretiens pour étudiants français (stage, alternance, CDI). Freemium.

**Stack**: Next.js 16.2.4 (App Router, Turbopack) · TypeScript · Supabase (Auth + Storage + PostgreSQL) · Prisma · OpenAI · next-intl · Tailwind CSS

## Quick Start

### Prérequis
- Node.js 20+
- Projet Supabase (supabase.com)
- Clé API OpenAI

### Setup

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local
# Remplir les variables (voir .env.example)

# 3. Database
npm run migrate

# 4. Supabase Storage
# Créer un bucket privé nommé 'cvs' dans le dashboard Supabase

# 5. Dev server
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## Commandes

```bash
npm run dev          # Serveur dev (Turbopack)
npm run build        # Build production
npm test             # Tests Jest
npx tsc --noEmit     # Vérification TypeScript
npm run migrate      # prisma db push
```

## Fonctionnalités

| Feature | Description |
|---------|-------------|
| Auth | Email/password via Supabase |
| Chat IA | Simulations d'entretien avec feedback scoring |
| Profil | Données personnelles + profil pro + postes cibles |
| CV Analysis | Upload PDF → extraction texte → analyse LLM |
| Dashboard | Stats progression, scores, conseils personnalisés |
| Landing | Page publique marketing |
| Admin | Users, stats, logs, stockage |
| i18n | FR / EN via next-intl |

## Architecture

```
src/
  app/
    [locale]/          ← Pages (FR/EN)
      (protected)/     ← Routes authentifiées
        chat/          ← Interface chat
        dashboard/     ← Dashboard utilisateur
        profile/       ← Profil + CV
      admin/           ← Back-office
    api/               ← API routes
  components/          ← Composants UI
  lib/                 ← Helpers (db, llm, llm-cv, api-response...)
  i18n/                ← Config next-intl
prisma/                ← Schema DB
messages/              ← Traductions FR/EN
```

**Patterns clés** — voir [.claude/CLAUDE.md](./.claude/CLAUDE.md) :
- API routes : auth → rate-limit → logique → successResponse
- LLM : gpt-4o-mini (chat/scoring/CV) + gpt-4o (génération longue)
- Stream protocol : `[FEEDBACK]{json}[/FEEDBACK]<question>`
- Soft delete uniquement (RGPD)

## Déploiement Vercel

1. Connecter le repo GitHub à Vercel
2. Configurer les variables d'environnement (voir `.env.example`)
3. Le CI/CD GitHub Actions valide les PR (`.github/workflows/ci.yml`)

## CI/CD

GitHub Actions sur chaque PR : `npx tsc --noEmit` + `npm run lint` + `npm test`

---

**Built for French students preparing their next interview**
