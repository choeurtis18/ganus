# ganus.fr — Interview Prep Platform

AI-powered interview prep for French students (internship/apprentice/CDI seekers).

**Stack**: Next.js 14 (App Router) • TypeScript • Supabase • OpenAI • Stripe

## Quick Start

### Prerequisites
- Node.js 20+
- Supabase project (create at supabase.com)
- OpenAI API key

### Setup

1. **Clone & install**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Fill in Supabase URL, OpenAI key, etc.
   ```

3. **Setup database**
   ```bash
   npx prisma migrate dev --name init
   ```

4. **Run dev server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## Project Structure

- **[.claude/](/.claude/)** — Claude Code hub (STATUS, RULES, MEMORY, PLANS)
- **[src/](src/)** — Application code (pages, components, utilities)
- **[prisma/](prisma/)** — Database schema & migrations
- **[__tests__/](__tests__/)** — Unit, integration, E2E tests
- **[docs/](docs/)** — Project documentation

👉 **Start with** [.claude/README.md](./.claude/README.md) to understand project info.

## Commands

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm test                 # Run Jest tests
npm run test:e2e         # Run Playwright tests
npx tsc --noEmit         # Check TypeScript
npm run migrate          # Prisma migrations
```

## Architecture

**Key Patterns** (see [.claude/CLAUDE.md](./.claude/CLAUDE.md)):
- API routes: parse → auth → rate-limit → business logic → track costs
- LLM strategy: gpt-4o-mini (cheap) + gpt-4o (quality)
- Hybrid chat: simple flow (< 10 msgs) + summarized flow (≥ 10 msgs)
- Encryption: AES-256-CBC field-level for sensitive data

## MVP Roadmap (Option A)

**Sprint 1: Foundation (Setup + Auth)**
- Phase 1.1: Supabase + Prisma setup
- Phase 1.2: NextAuth + User model
- Phase 1.3: Chat core + UI foundation

**Sprint 2: LLM Integration**
- OpenAI integration
- Streaming responses
- Cost tracking

**Sprint 3: Polish**
- Error handling
- Rate limiting
- E2E tests
- Beta-ready

**Phase 2** (After MVP validation)
- CV Analysis (5 LLM calls)
- Job Analysis (5 LLM calls)
- Subscription system + Stripe

**Current**: MVP Sprint 1 Phase 1.1 (Just starting)

## Important Links

- 📖 [CLAUDE.md](./.claude/CLAUDE.md) — Project instructions & architecture
- 🧠 [Memory Index](./.claude/memory/MEMORY.md) — Technical decisions & context
- 🎯 [MVP Plan](./.claude/plans/mvp-sprint-1.md) — Sprint 1 breakdown

---

**Built with ❤️ for interview prep**
