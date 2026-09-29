# Card Service

## Purpose

Define unit testing requirements for CardService — listing cards, freezing, and unfreezing.

## Requirements

### Requirement: CardService getCards
The system SHALL return all cards for a user ordered by creation date descending.

#### Scenario: Get cards returns user cards
- **WHEN** `getCards("user-1")` is called
- **THEN** it SHALL call `prisma.card.findMany` with `userId`
- **THEN** it SHALL order results by `createdAt: "desc"`

### Requirement: CardService freeze
The system SHALL freeze a card, raising errors if the card is not found or already frozen.

#### Scenario: Freeze an active card
- **WHEN** `freeze("card-1", "user-1")` is called with an existing active card
- **THEN** it SHALL update the card with `isFrozen: true`

#### Scenario: Freeze throws on card not found
- **WHEN** `freeze("invalid", "user-1")` is called with a non-existent card
- **THEN** it SHALL throw `NotFoundException` with "Card not found"

#### Scenario: Freeze throws on already frozen card
- **WHEN** `freeze("card-1", "user-1")` is called on an already frozen card
- **THEN** it SHALL throw `UnprocessableEntityException` with "Card is already frozen"

### Requirement: CardService unfreeze
The system SHALL unfreeze a card, raising errors if the card is not found or not frozen.

#### Scenario: Unfreeze a frozen card
- **WHEN** `unfreeze("card-1", "user-1")` is called with an existing frozen card
- **THEN** it SHALL update the card with `isFrozen: false`

#### Scenario: Unfreeze throws on card not found
- **WHEN** `unfreeze("invalid", "user-1")` is called with a non-existent card
- **THEN** it SHALL throw `NotFoundException` with "Card not found"

#### Scenario: Unfreeze throws on not frozen card
- **WHEN** `unfreeze("card-1", "user-1")` is called on an already unfrozen card
- **THEN** it SHALL throw `UnprocessableEntityException` with "Card is not frozen"
