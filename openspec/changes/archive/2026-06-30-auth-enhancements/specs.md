# Auth Enhancements — Specifications

## ReCAPTCHA

Bot protection on signup and login endpoints using Google ReCAPTCHA v3. Invisible to users with environment-aware behavior: fail-fast in production if misconfigured, safe bypass in dev.

### R1: ReCAPTCHA on signup

The system MUST validate a ReCAPTCHA token on POST /auth/register.

#### Scenario: Valid token passes
- GIVEN a valid ReCAPTCHA token with score >= 0.5
- WHEN POST /auth/register is called with valid signup data + `recaptchaToken`
- THEN the system MUST proceed with registration

#### Scenario: Low score rejected
- GIVEN a ReCAPTCHA token with score < 0.5
- WHEN POST /auth/register is called
- THEN the system MUST return 403 Forbidden

#### Scenario: Missing token rejected
- GIVEN no `recaptchaToken` in the request body
- WHEN POST /auth/register is called
- THEN the system MUST return 400 Bad Request

### R2: ReCAPTCHA on login

The system MUST validate a ReCAPTCHA token on POST /auth/login.

#### Scenario: Valid token passes
- GIVEN a valid ReCAPTCHA token with score >= 0.5
- WHEN POST /auth/login is called with valid credentials
- THEN the system MUST proceed with login

#### Scenario: Low score rejected
- GIVEN a ReCAPTCHA token with score < 0.5
- WHEN POST /auth/login is called with valid credentials
- THEN the system MUST return 403 Forbidden

### R3: Environment-aware graceful degradation

The system MUST NOT bypass ReCAPTCHA in production if keys are missing — it MUST fail-fast.

#### Scenario: Production + missing keys = fail-fast
- GIVEN `NODE_ENV=production` and `RECAPTCHA_SECRET_KEY` is not set
- WHEN the server starts
- THEN the system MUST throw `InternalServerErrorException("ReCAPTCHA is misconfigured in production")`
- AND refuse to serve auth endpoints

#### Scenario: Dev + missing keys = bypass
- GIVEN `NODE_ENV=development` and `RECAPTCHA_SECRET_KEY` is not set
- WHEN POST /auth/register is called without a `recaptchaToken`
- THEN the system MUST proceed with registration (bypass)
- AND log a warning about missing ReCAPTCHA config

### R4: Score threshold config

The minimum ReCAPTCHA score MUST be configurable via `RECAPTCHA_THRESHOLD` env var, defaulting to 0.5.

#### Scenario: Custom threshold
- GIVEN `RECAPTCHA_THRESHOLD=0.3`
- WHEN a request scores 0.4
- THEN the system MUST accept it

---

## Apple OAuth

Sign in with Apple mirroring the existing Google OAuth pattern. Apple uses a dynamically signed JWT as client_secret (ES256, from .p8 key) — not a static secret.

### R1: Apple returns AuthProviderEnum.APPLE

The system MUST set `authProvider: APPLE` when a user signs up via Apple.

#### Scenario: Apple user created
- GIVEN a valid Apple identity token
- WHEN the Apple OAuth flow completes
- THEN a user MUST be created with `authProvider` set to `APPLE`
- AND the user MUST be logged in with a valid session

#### Scenario: Apple user already exists
- GIVEN a user with email "user@example.com" created via email/password
- WHEN the same email authenticates via Apple
- THEN the system MUST login the existing user (link account)

### R2: Apple OAuth env config

The system MUST read Apple OAuth config from environment variables and gracefully disable if missing.

#### Scenario: Apple OAuth disabled
- GIVEN `APPLE_CLIENT_ID` is not set
- WHEN a request to `/auth/apple` is made
- THEN the system MUST return a 4xx error explaining Apple OAuth is not configured

### R3: Web redirect flow

The system MUST support the standard OAuth web redirect flow for Apple.

#### Scenario: Apple redirect
- GIVEN a valid Apple OAuth config
- WHEN GET /auth/apple is called
- THEN the system MUST redirect to Apple's authorization page

#### Scenario: Apple callback
- GIVEN Apple redirects back with an authorization code
- WHEN the callback endpoint receives the code (GET or POST — Apple uses `form_post`)
- THEN the system MUST exchange the code for tokens, find/create the user, and set session cookies

### R4: Client secret is a cached JWT from .p8 key

Apple requires a signed JWT (ES256) as `client_secret`. The system MUST generate this JWT using the Apple private key (.p8) and cache it to avoid signing on every request.

#### Scenario: Client secret generated on first request
- GIVEN the Apple private key (.p8) is configured
- WHEN the first Apple OAuth request is made
- THEN the system MUST generate a client_secret JWT signed with the private key
- AND cache it for subsequent requests

#### Scenario: Cached secret used on subsequent requests
- GIVEN a client_secret JWT was generated 1 hour ago (expires in 6 months)
- WHEN a second Apple OAuth request is made
- THEN the system MUST reuse the cached JWT without re-signing

#### Scenario: Secret auto-renewed before expiry
- GIVEN a cached client_secret JWT is within 1 day of expiry
- WHEN an Apple OAuth request is made
- THEN the system MUST generate a new JWT before using it

---

## IP Geolocation

Resolve IP addresses to geographic location on session creation using `@nestjs/event-emitter` so the login response is NOT blocked by the geolocation API call. Location populates async in the background.

### R1: Geolocation via EventEmitter (async, non-blocking)

The system MUST emit a `session.created` event after session creation. A separate listener MUST resolve the location asynchronously and update the session record.

#### Scenario: Login from Buenos Aires
- GIVEN a login request from IP resolved to Buenos Aires, Argentina
- WHEN a session is created and `session.created` is emitted
- THEN the login response MUST return immediately (200 OK) with no location
- AND the `GeolocationListener` MUST eventually set `session.location` to "Buenos Aires, Argentina"

#### Scenario: Login with private IP
- GIVEN a login request from a private IP (192.168.x.x, 10.x.x.x, 127.0.0.1)
- WHEN the geolocation listener processes the event
- THEN `session.location` MUST be set to "Local network" without calling the external API

### R2: Graceful degradation

The system MUST NOT fail if the geolocation API is unreachable.

#### Scenario: API timeout
- GIVEN the geolocation API is unreachable
- WHEN the geolocation listener processes the event
- THEN `session.location` MUST remain null or "Unknown"
- AND the error MUST be logged but NOT thrown

### R3: Cached lookups

The system SHOULD cache geolocation results in Redis to avoid hitting the API for repeated IPs. Cache TTL MUST be 1 hour.

#### Scenario: Same IP within cache TTL
- GIVEN IP 181.xxx.xxx.xxx was resolved 2 minutes ago
- WHEN a new session is created from the same IP
- THEN the listener MUST return the cached location WITHOUT calling the external API

### R4: Free API

The geolocation service MUST have a free tier sufficient for development and low-traffic production.

#### Scenario: ip-api.com free tier
- GIVEN ip-api.com is configured (free, 45 req/min)
- WHEN location is resolved
- THEN the system MUST use ip-api.com (or configurable provider)
