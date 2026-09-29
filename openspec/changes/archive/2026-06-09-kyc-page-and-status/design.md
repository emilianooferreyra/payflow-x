## Context

KYC module exists in the backend with full state machine (PENDING → IN_REVIEW → APPROVED/REJECTED) and a `GET /kyc/status` endpoint. The frontend has zero KYC visibility: no page, no badge, no status indicator. Users hit 403 on financial endpoints without knowing why.

The user profile endpoint (`GET /users/me`) returns basic user data but does NOT include KYC status. The frontend needs KYC info in the main profile query to avoid an extra network call on every page.

## Goals / Non-Goals

**Goals:**
- Expose KYC status in the existing `GET /users/me` endpoint via Prisma include (no new endpoint needed)
- Create a `/kyc` page with clear visual states for each KYC status
- Show KYC status badge in the sidebar (nav-user dropdown area)
- Show KYC status on the dashboard
- Add sidebar link to the KYC page under profile nav

**Non-Goals:**
- Document upload (images/PDFs) — the current backend only stores `documentType` string
- Admin review panel — use existing `POST /kyc/review` endpoint
- Notifications when KYC status changes — will be handled in notifications change
- Webhook events for KYC changes — out of scope

## Decisions

### Decision 1: Expand GET /users/me with Prisma include vs separate API call
**Chosen**: Include KYC in `GET /users/me` via Prisma `include: { kyc: true }`
- **Alternative**: Separate `GET /kyc/status` call on every page mount
- **Rationale**: The frontend needs KYC status on every protected page (sidebar, dashboard). A separate call means every page load fires 2 queries instead of 1. KYC data is small and rarely changes — including it in the user profile is negligible overhead.
- **Trade-off**: Every `GET /users/me` response grows by ~6 fields. Acceptable.

### Decision 2: KYC page as single client component
**Chosen**: One `page.tsx` with conditional rendering per KYC status
- **Alternative**: Separate components per status (PendingView, ApprovedView, etc.)
- **Rationale**: The page is simple enough (4 states, 1 submit form) that separate components add indirection without benefit. Extract to components only if the page grows.
- **Trade-off**: If more states or complexity are added later, refactoring is easy.

### Decision 3: KYC badge placement
**Chosen**: Add KYC badge inside `NavUser` dropdown (below user name/email) and as a sidebar nav item
- **Alternative**: Badge on sidebar header or as a banner on every page
- **Rationale**: NavUser is always visible and shows user context. A sidebar link provides direct navigation. Banners are too intrusive for a status that rarely changes.

### Decision 4: KYC link in sidebar profile nav
**Chosen**: Add "Verificación de identidad" between "Perfil" and "Datos y privacidad"
- **Rationale**: KYC is a user identity setting. The profile nav is the logical home for identity-related pages.

## Risks / Trade-offs

- [Risk] User submits KYC but never gets reviewed → Mitigation: Seed `KYC_APPROVED` is the default state in development seed script. Demo accounts start approved.
- [Risk] Frontend caches stale KYC status → Mitigation: Query `staleTime: 5 min` on `["me"]` query (already configured), plus user can refresh the page.
- [Risk] Prisma `include: { kyc: true }` adds a JOIN on every `GET /users/me` → Mitigation: KYC table is 1:1 with User, indexed by userId. JOIN is a single indexed lookup.
