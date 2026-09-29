## 1. Dependencies & Config

- [x] 1.1 Install `csrf-csrf`
- [x] 1.2 Add `CSRF_ENABLED` (z.boolean, default true) and `CSRF_SECRET` (z.string) to envs.ts Zod schema
- [x] 1.3 Add defaults to `.env.example`

## 2. Helmet CSP

- [x] 2.1 Configure CSP in `main.ts`: `defaultSrc: ["'none'"]`, no scripts, no styles, no fonts — API-only policy
- [x] 2.2 Apply same config in `e2e/setup-app.ts`

## 3. CSRF Guard & Middleware

- [x] 3.1 Create `CsrfGuard` using `csrf-csrf`, configuring the cookie options with `httpOnly: true`, `secure: true`, and `sameSite: 'lax'`
- [x] 3.2 Guard reads `CSRF_ENABLED` env — skip validation when disabled (e2e)
- [x] 3.3 Create `@SkipCsrf()` decorator using NestJS Reflector for webhook/webhook routes
- [x] 3.4 Register as `APP_GUARD` in `app.module.ts`

## 4. CSRF Token Endpoint

- [x] 4.1 Add `GET /auth/csrf-token` to AuthController
- [x] 4.2 Generate signed httpOnly cookie + return raw token strictly in the JSON body (`{ token: string }`)
- [x] 4.3 Exclude from CSRF validation (it's the bootstrap endpoint)

## 5. Tests

- [x] 5.1 Write unit tests for CsrfGuard (enabled/disabled, excluded routes, valid/invalid tokens)
- [x] 5.2 Update e2e `setup-app.ts` to disable CSRF
- [x] 5.3 Run full test suite
