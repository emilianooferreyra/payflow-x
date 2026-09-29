# Spec: Express types

## Requirements

- Add `import type { Response } from "express"` and type all `res` parameters
- Add `import type { Request } from "express"` and type `req` in refresh strategy

## Files affected

| File | Parameters to type | Count |
|------|-------------------|-------|
| `src/modules/auth/auth.service.ts` | `register(dto, res)`, `refresh(token, res)`, `googleLogin(user, res, ...)`, `logout(sessionId, res)` | 4 |
| `src/modules/auth/session-token.service.ts` | `setTokenCookies(res, ...)`, `clearTokenCookies(res)`, `createSessionWithTokens(userId, res, ...)` | 3 |
| `src/modules/auth/two-factor.service.ts` | `verifyTwoFactor(userId, code, res)` | 1 |
| `src/modules/auth/strategies/refresh.strategy.ts` | `validate(req, payload)` | 1 |

## Scenarios

- `res.cookie()`, `res.clearCookie()`, `res.status()`, `res.json()` all work after typing — these are standard Express Response methods
- Accessing `req.cookies` in refresh strategy is typed after `req: Request`
