## ADDED Requirements

### Requirement: User can view KYC status
The system SHALL display the user's current KYC verification status with clear visual feedback.

#### Scenario: View KYC status while APPROVED
- **WHEN** user navigates to the KYC page
- **AND** their KYC status is APPROVED
- **THEN** the page SHALL show a success badge with "Verificación completada"
- **AND** SHALL display the document type and submission date

#### Scenario: View KYC status while PENDING
- **WHEN** user navigates to the KYC page
- **AND** their KYC status is PENDING
- **THEN** the page SHALL show an info badge with "Pendiente de envío"
- **AND** SHALL show the document submission form

#### Scenario: View KYC status while IN_REVIEW
- **WHEN** user navigates to the KYC page
- **AND** their KYC status is IN_REVIEW
- **THEN** the page SHALL show a loading/warning badge with "En revisión"
- **AND** SHALL display the submitted document type and submission date
- **AND** SHALL NOT show the submission form

#### Scenario: View KYC status while REJECTED
- **WHEN** user navigates to the KYC page
- **AND** their KYC status is REJECTED
- **THEN** the page SHALL show a destructive badge with "Rechazado"
- **AND** SHALL show the submission form again so the user can retry

### Requirement: User can submit KYC documents
The system SHALL allow users to submit their KYC verification with a document type selection.

#### Scenario: Submit KYC with valid document type
- **WHEN** user selects a document type (DNI, PASSPORT, or DRIVER_LICENSE)
- **AND** clicks "Enviar verificación"
- **THEN** the system SHALL call POST /kyc/submit with the selected documentType
- **AND** the status SHALL update to IN_REVIEW
- **AND** the page SHALL display the IN_REVIEW state

#### Scenario: Submit KYC while not in PENDING or REJECTED state
- **WHEN** user's KYC status is APPROVED or IN_REVIEW
- **THEN** the submission form SHALL NOT be displayed

### Requirement: KYC status appears in sidebar
The system SHALL show the user's current KYC status in the sidebar navigation.

#### Scenario: KYC badge in NavUser dropdown
- **WHEN** user opens the user menu dropdown in the sidebar
- **THEN** the dropdown SHALL display the current KYC status as a badge
- **AND** the badge SHALL use the same color mapping as the KYC page

#### Scenario: Sidebar link to KYC page
- **WHEN** user looks at the sidebar navigation
- **THEN** there SHALL be a "Verificación de identidad" link under the profile section
- **AND** clicking it SHALL navigate to /kyc

### Requirement: Dashboard shows KYC summary
The system SHALL display a KYC status summary on the dashboard page.

#### Scenario: Dashboard shows KYC status
- **WHEN** user views the dashboard
- **THEN** a KYC status indicator SHALL be visible
- **AND** if KYC is not APPROVED, SHALL prompt the user to complete verification

### Requirement: User profile includes KYC data
The GET /users/me endpoint SHALL include the user's KYC verification data.

#### Scenario: GET /users/me returns KYC fields
- **WHEN** frontend calls GET /users/me
- **THEN** the response SHALL include `kyc` object with `status`, `documentType`, `submittedAt`, `reviewedAt`, `createdAt`
- **AND** if no KYC record exists, `kyc` SHALL be null
