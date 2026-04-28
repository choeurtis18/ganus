# /prisma Directory

Database schema and migrations managed by Prisma ORM.

## Files

- **schema.prisma** — Database schema definition (6 models)
- **migrations/** — Auto-generated migrations from `prisma migrate dev`

## Common Commands

```bash
# Generate migration (after schema changes)
npx prisma migrate dev --name descriptive_name

# Deploy migrations (production)
npx prisma migrate deploy

# Validate schema
npx prisma validate

# Open Prisma Studio (interactive browser)
npx prisma studio
```

## Models

1. **User** — Users with subscription plan (free/pro)
2. **ChatSession** — Interview chat sessions
3. **CVAnalysis** — CV upload & analysis results
4. **JobOffer** — Job offers & analysis
5. **LLMLog** — Track all AI calls (cost, tokens)
6. **UserUsage** — Monthly usage tracking

See `schema.prisma` for full definitions.

## Important Rules

- Never DELETE columns/tables — mark as `@deprecated` in comments
- Always write UP and DOWN migrations
- Test migrations in staging first
- Add indexes for frequently queried fields (userId, email, createdAt)
- Use transactions for multi-step operations
