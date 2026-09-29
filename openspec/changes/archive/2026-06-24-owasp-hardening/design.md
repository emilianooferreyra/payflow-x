## Context

The backend uses httpOnly cookies for JWT-based authentication. While this prevents XSS-based token theft, it exposes the API to CSRF attacks: a malicious site can induce the user's browser to send authenticated requests (cookies are sent automatically). For a fintech, this is unacceptable.

Additionally, Helmet is used with default settings but no explicit CSP policy, leaving a gap in defense-in-depth.

## Goals / Non-Goals

**Goals:**
- Prevent CSRF attacks via double-submit cookie pattern
- Restrict CSP to API-only policy (`default-src 'none'`)
- Keep implementation simple — no session state, no server-side rendering
- Allow e2e tests and webhooks to bypass CSRF

**Non-Goals:**
- Server-side rendered pages or templates (this is a pure API)
- Stateful CSRF tokens (double-submit cookie is stateless by design)
- Protecting `GET`/`HEAD`/`OPTIONS` (not needed — they don't mutate state)

## Decisions

### Decision: csrf-csrf over csurf

**Chosen: csrf-csrf.** The `csurf` package is deprecated. `csrf-csrf` is the actively maintained fork with the same API, TypeScript support, and double-submit cookie pattern built-in.

### Decision: Double-submit cookie over synchronizer token pattern

**Chosen: Double-submit cookie.** No server-side session storage needed. The SPA reads the token from the response body and sends it as a header. The server verifies header matches cookie. Stateless, simple, aligned with our JWT-based auth.

### Decision: CSP default-src 'none'

**Chosen: 'none'.** Since this is a pure REST API that never serves HTML, CSS, or JavaScript, the most restrictive policy is the correct one. No inline scripts, no external resources, no frames, no fonts. If an attacker manages to upload a file, the browser will refuse to render it.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| SPA must manage CSRF token in memory | Token is fetched once on app load; stored in JS memory (not localStorage). If page refreshes, fetch again. |
| Webhooks from payment gateways don't send CSRF tokens | Exclude routes via NestJS `@SkipCsrf()` decorator using the Reflector. Webhooks are server-to-server, no browser involved. |
| Non-httpOnly cookie could be read by XSS | **Eliminated Risk (Library Feature):** The `csrf-csrf` library keeps the CSRF cookie `httpOnly: true`. The SPA never reads the cookie directly. Instead, the SPA fetches the plaintext token via a JSON response from `GET /auth/csrf-token` and keeps it strictly in JavaScript memory. This ensures both session tokens and CSRF tokens are completely immune to XSS-based extraction. |

## Migration Plan

1. Install `csrf-csrf` and configure env vars
2. Create `CsrfGuard` and register globally
3. Add `GET /auth/csrf-token` endpoint
4. Configure Helmet CSP
5. Update e2e setup to disable CSRF
6. Write tests
