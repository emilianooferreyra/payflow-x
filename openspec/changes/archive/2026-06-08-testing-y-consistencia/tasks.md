## 1. Testing Infrastructure

- [x] 1.1 Create `src/common/testing/` directory with index barrel export
- [x] 1.2 Create `mockPrisma` object with `jest.fn()` stubs for all Prisma models
- [x] 1.3 Create `createTestingModule` helper function
- [x] 1.4 Create entity factory functions (`makeUser`, `makeSession`, `makeWallet`)
- [x] 1.5 Create `makeAdminUser` factory with admin defaults
- [x] 1.6 Verify `npm run test` passes with the new helpers (no tests yet, just no compilation errors)

## 2. Core Unit Tests

- [x] 2.1 Write `HashService` unit tests (`src/modules/hash/hash.service.spec.ts`)
- [x] 2.2 Write `PrismaService` unit tests (`src/modules/prisma/prisma.service.spec.ts`)
- [x] 2.3 Write `SessionService` unit tests (`src/modules/session/session.service.spec.ts`)
- [x] 2.4 Write `UsersService` unit tests (`src/modules/users/users.service.spec.ts`)
- [x] 2.5 Run `npm run test` and verify all tests pass

## 3. Code Consistency — Commom typo

- [x] 3.1 Create `src/common/enums/` directory
- [x] 3.2 Move all files from `src/commom/enums/` to `src/common/enums/`
- [x] 3.3 Update all imports referencing `src/commom/` across the entire codebase
- [x] 3.4 Run `tsc --noEmit` and verify zero compilation errors
- [x] 3.5 Remove `src/commom/` directory
- [x] 3.6 Run `npm run test` and verify all tests pass

## 4. Code Consistency — Missing DTOs

- [x] 4.1 Create `src/modules/users/dto/create-user.dto.ts` and `update-user.dto.ts`
- [x] 4.2 Create `src/modules/card/dto/create-card.dto.ts`
- [x] 4.3 Create `src/modules/exchange-rate/dto/query-rate.dto.ts`
- [x] 4.4 Integrate DTOs into corresponding controllers (replace inline body types)
- [x] 4.5 Run `tsc --noEmit` and verify zero compilation errors

## 5. Code Consistency — Type res as Response

- [x] 5.1 Find all `res: any` occurrences in controller files (`rg "res.*:.*any" src/modules/*/`)
- [x] 5.2 Replace each with `res: Response` and add `import { Response } from "express"`
- [x] 5.3 Run `tsc --noEmit` and verify zero compilation errors
- [x] 5.4 Run `npm run lint` and verify no lint errors
