## Why

KYC verification is the gateway to all financial operations (deposit, withdraw, exchange). Users have no way to see their KYC status, submit documents, or know why they're blocked. Without a KYC page, every new user hits a 403 wall with no explanation.

## What Changes

- Add `kycStatus` and `kycDocumentType` to `GET /users/me` response so the frontend can read KYC state from the user profile
- Create `/kyc` page in the frontend with:
  - Status display (PENDING / IN_REVIEW / APPROVED / REJECTED)
  - Submit form (select document type + submit)
  - Visual states per status (pending spinner, approved badge, rejected with retry)
- Add KYC status badge to the sidebar (NavUser dropdown or sidebar itself)
- Add KYC status indicator to the dashboard
- Add "Verificación de identidad" link to the sidebar profile nav

## Capabilities

### New Capabilities
- `kyc-page`: KYC verification page with status display, document submission, and guided states for each KYC status

### Modified Capabilities
*(none — no existing specs to modify)*

## Impact

- **Backend**: `src/modules/users/users.controller.ts` — expand `GET /users/me` to include KYC data via Prisma include
- **Frontend**: New `app/(dashboard)/kyc/page.tsx`, update `lib/api/auth.ts` `UserProfile` type, update `components/nav-user.tsx` with KYC badge, update `components/app-sidebar.tsx` with KYC link, update dashboard page with KYC status
