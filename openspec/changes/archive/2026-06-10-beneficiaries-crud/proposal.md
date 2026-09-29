# Proposal: Beneficiaries CRUD

## Intent

Replace the hardcoded mock saved accounts in the withdraw flow with real persisted beneficiaries. Users need to manage their withdrawal destinations (CBU, CVU, alias, SWIFT) through a proper CRUD interface.

## Scope

### In Scope

- Prisma `Beneficiary` model with migration
- Backend module (`beneficiaries/`) with full CRUD endpoints
- Frontend API layer (`lib/api/beneficiaries.ts`)
- Beneficiary management page/dialog for CRUD
- Real beneficiaries replace mock `savedAccounts` in withdraw flow

### Out of Scope

- Beneficiary selection in exchange/transfer flows
- Bank account verification / micro-deposit validation

## Approach

NestJS module following the exact same patterns as KYC and Wallet (PrismaModule import, DTO validation, JwtAuthGuard, CurrentUser decorator). Frontend uses existing react-query + axios patterns. Replace mock data import in withdraw page with `useQuery`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | +`Beneficiary` model, +`BeneficiaryTypeEnum` |
| `src/modules/beneficiaries/` | New | Module, controller, service, DTOs |
| `src/app.module.ts` | Modified | Import BeneficiariesModule |
| `payflow-front/lib/api/beneficiaries.ts` | New | API functions |
| `payflow-front/app/(dashboard)/retirar/page.tsx` | Modified | Replace mock with real data |
| `payflow-front/app/(dashboard)/beneficiaries/` | New | CRUD page |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Deleting a beneficiary referenced in past transactions | Low | Soft delete (isActive=false), no FK constraint on tx history |
| User creates duplicate beneficiaries | Low | Unique constraint on (userId, alias) |

## Rollback Plan

Revert Prisma migration, delete module folder, remove import from app.module, restore mock data in withdraw page.

## Dependencies

None — fully standalone feature.

## Success Criteria

- [ ] `POST /beneficiaries` creates a beneficiary and returns it
- [ ] `GET /beneficiaries` returns only the current user's beneficiaries
- [ ] Withdraw page loads real beneficiaries instead of mocks
- [ ] Beneficiary CRUD page allows create, edit, delete
