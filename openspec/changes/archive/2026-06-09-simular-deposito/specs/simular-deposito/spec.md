## ADDED Requirements

### Requirement: User can simulate a deposit
The system SHALL allow the user to simulate a USD deposit from the depositar page for demo purposes.

#### Scenario: Simulate a deposit with valid amount
- **WHEN** user enters a deposit amount (e.g. 100)
- **AND** selects USD currency
- **AND** clicks "Simular depósito"
- **THEN** the system SHALL call POST /wallet/deposit with the given currency and amount
- **AND** SHALL show a success toast with the credited amount
- **AND** SHALL invalidate the wallets and transactions query cache
- **AND** SHALL update the recent deposits list

#### Scenario: Attempt to simulate deposit with zero amount
- **WHEN** user clicks "Simular depósito" with amount 0 or empty
- **THEN** the button SHALL be disabled
- **AND** SHALL show a validation message

#### Scenario: Simulation card is visually distinct
- **WHEN** user views the depositar page
- **THEN** the simulation card SHALL be clearly labeled "Simulación"
- **AND** SHALL be visually separate from the banking instructions
