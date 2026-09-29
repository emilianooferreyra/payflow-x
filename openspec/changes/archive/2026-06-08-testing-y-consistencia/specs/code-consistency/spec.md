## ADDED Requirements

### Requirement: Rename `commom/` to `common/`
The system SHALL rename the directory `src/commom/` to `src/common/` and update all imports across the codebase.

#### Scenario: Directory is renamed
- **WHEN** checking the filesystem
- **THEN** `src/commom/` SHALL NOT exist and its contents SHALL be at `src/common/enums/`

#### Scenario: All imports are updated
- **WHEN** compiling with `tsc --noEmit`
- **THEN** there SHALL be no compilation errors from outdated imports referencing `commom`

### Requirement: Add DTOs to Users module
The system SHALL add DTO classes with class-validator decorators for user creation and update in `src/modules/users/dto/`.

#### Scenario: CreateUserDto validates email
- **WHEN** validating a CreateUserDto with invalid email
- **THEN** the validation SHALL fail with appropriate error

#### Scenario: UpdateUserDto validates optional fields
- **WHEN** validating an UpdateUserDto
- **THEN** all fields SHALL be optional

### Requirement: Add DTOs to Card module
The system SHALL add DTO classes for card operations in `src/modules/card/dto/`.

#### Scenario: Card DTO validates type
- **WHEN** creating a card with an invalid type
- **THEN** the validation SHALL fail

### Requirement: Add DTOs to ExchangeRate module
The system SHALL add a DTO class for exchange rate queries in `src/modules/exchange-rate/dto/`.

#### Scenario: ExchangeRateDto validates currency pair
- **WHEN** querying with invalid currency
- **THEN** the validation SHALL fail with appropriate error

### Requirement: Type `res` as Express Response
The system SHALL replace `res: any` with `res: Response` from `express` in all controller methods.

#### Scenario: Response is typed
- **WHEN** compiling with `tsc --noEmit`
- **THEN** there SHALL be no type errors from Response type usage
