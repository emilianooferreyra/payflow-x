## ADDED Requirements

### Requirement: TokensService specific errors
The system SHALL replace generic `BadRequestException("There was an error.")` in TokensService with specific error messages that include the operation name and error context.

#### Scenario: Create token error includes context
- **WHEN** token creation fails
- **THEN** the error SHALL include the token type and original error message

#### Scenario: Verify token error includes context
- **WHEN** token verification fails
- **THEN** the error SHALL include the token type and reason for failure

### Requirement: EmailsService specific errors
The system SHALL replace generic `BadRequestException("There was an error.")` in EmailsService with specific error messages that include the email type and recipient.

#### Scenario: Send email error includes recipient
- **WHEN** email sending fails
- **THEN** the error SHALL include the recipient email and template type
