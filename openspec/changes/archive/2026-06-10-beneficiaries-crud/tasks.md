## Tasks

### 1. Prisma — Beneficiary model

- [x] 1.1 Add `BeneficiaryTypeEnum` and `Beneficiary` model to `prisma/schema.prisma`
- [x] 1.2 Run `npx prisma migrate dev --name add-beneficiaries`

### 2. Backend — Beneficiaries module

- [x] 2.1 Create DTOs: `create-beneficiary.dto.ts`, `update-beneficiary.dto.ts`
- [x] 2.2 Create `beneficiaries.service.ts` — CRUD operations scoped to userId
- [x] 2.3 Create `beneficiaries.controller.ts` — REST endpoints with JwtAuthGuard
- [x] 2.4 Create `beneficiaries.module.ts` — import PrismaModule
- [x] 2.5 Register `BeneficiariesModule` in `app.module.ts`

### 3. Frontend — Beneficiary CRUD

- [x] 3.1 Create `lib/api/beneficiaries.ts` — API functions
- [x] 3.2 Create beneficiaries management page with CRUD table/form

### 4. Frontend — Withdraw integration

- [x] 4.1 Replace mock `savedAccounts` with real beneficiaries query in withdraw page
