## 1. Backend — Expose KYC in /users/me

- [x] 1.1 Add `kyc: { include: ... }` to the Prisma query in UsersController or UsersService `getMe()` method
- [x] 1.2 Verify the response shape includes `kyc.status`, `kyc.documentType`, `kyc.submittedAt`, `kyc.reviewedAt`

## 2. Frontend — KYC type and API layer

- [x] 2.1 Add `KycStatus` type (PENDING | IN_REVIEW | APPROVED | REJECTED) and `kyc` field to `UserProfile` interface in `lib/api/auth.ts`
- [x] 2.2 Create `lib/api/kyc.ts` with `getKycStatus()`, `submitKyc(documentType)` functions calling backend endpoints

## 3. Frontend — KYC page

- [x] 3.1 Create `app/(dashboard)/kyc/page.tsx` with:
  - Query user profile to get KYC status
  - PENDING state: document type selector (DNI, PASSPORT, DRIVER_LICENSE) + submit button
  - IN_REVIEW state: info badge + submitted info (no form)
  - APPROVED state: success badge + completed info
  - REJECTED state: error badge + retry form
- [x] 3.2 Add copy-field for document type values matching the backend enum (DNI, PASSPORT, DRIVER_LICENSE)

## 4. Frontend — KYC badge in sidebar

- [x] 4.1 Read KYC status from `getMe()` query in `nav-user.tsx` and display a colored badge below user info
- [x] 4.2 Add "Verificación de identidad" link to sidebar profile nav in `app-sidebar.tsx` with `RiShieldUserLine` icon

## 5. Frontend — Dashboard KYC indicator

- [x] 5.1 Add KYC status card or badge to `app/(dashboard)/dashboard/page.tsx` showing current status
- [x] 5.2 If KYC is not APPROVED, show a call-to-action linking to `/kyc` page
