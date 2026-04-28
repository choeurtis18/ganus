# /__tests__ Directory

Test files organized by type.

## Structure

### /unit
Unit tests for individual functions/utilities:
- `encryption.test.ts` — Tests for encrypt/decrypt
- Test file naming: `fileName.test.ts`
- Located: `__tests__/unit/pathToFunction.test.ts`

Example: Testing `src/lib/validators.ts` → `__tests__/unit/validators.test.ts`

### /integration
Integration tests for features combining multiple units:
- Auth flow (signup → email verification → login)
- Chat flow (create session → send message → get response)
- CV analysis flow (upload → analyze → display)

Example: `__tests__/integration/auth-flow.test.ts`

### /e2e
End-to-end tests using Playwright:
- Full user journeys
- Browser automation
- Visual regression

Example: `__tests__/e2e/user-interview-journey.test.ts`

## Running Tests

```bash
npm test                                    # All tests
npm test -- fileName.test.ts                # Single file
npm test -- --coverage                      # With coverage report
npm run test:e2e                            # Playwright E2E tests
```

## Coverage Target

- **Target**: 70% (critical paths only)
- **Focus**: Core business logic (encryption, auth, chat flow, cost tracking)
- **Mock**: OpenAI, Supabase in tests

## Test Naming

- `test('should do X')` — Behavior-focused
- `describe('Feature Name')` — Group related tests
- Setup/teardown in `beforeEach`/`afterEach`
