# /src Directory

Main source code directory organized by domain.

## Structure

### /app
Next.js App Router pages and API routes.
- Public pages: `/`, `/pricing`, `/404`
- Auth pages: `/login`, `/signup`, `/reset-password`
- Protected pages: `/dashboard` (with nested routes)
- Admin pages: `/admin`
- API routes: `/api/*`

### /components
React components organized by domain:
- **layout/** — Header, Sidebar, Footer (used in RootLayout)
- **auth/** — LoginForm, SignupForm, OAuthButtons
- **profile/** — ProfileForm, ProfileDisplay, ProfileWizard
- **chat/** — ChatWindow, MessageBubble, FeedbackBox
- **cv/** — CVUpload, CVAnalysisDisplay, CVResults
- **shared/** — Button, Card, Input, Modal, Dialog (reusable)

**Rule**: One component per file, max 300 lines.

### /lib
Utility functions and helpers (flat structure):
- `encryption.ts` — AES-256-CBC encrypt/decrypt
- `validators.ts` — Zod schemas
- `api-response.ts` — Standardized API responses
- `auth.ts` — NextAuth configuration (to create)
- `supabase.ts` — Supabase client (to create)
- `openai.ts` — OpenAI client + streaming (to create)
- `rate-limit.ts` — Rate limiting logic (to create)
- `llm-cost-tracker.ts` — Token counting, cost calculation (to create)

### /types
TypeScript interfaces and types:
- `index.ts` — All type definitions

### /styles
Global styles and theme configuration:
- `globals.css` — Already created by Next.js
- Theme variables, utility classes
