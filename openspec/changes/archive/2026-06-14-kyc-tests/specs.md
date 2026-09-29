# KycService — Unit Tests

## Requirements

1. **getStatus() existing** — Devuelve el KYC existente si el usuario ya tiene uno
2. **getStatus() new** — Crea un nuevo KYC en PENDING si el usuario no tiene uno
3. **submit() from PENDING** — Cambia a IN_REVIEW, guarda documentType y submittedAt
4. **submit() from REJECTED** — Cambia a IN_REVIEW (se puede re-submitir)
5. **submit() from IN_REVIEW** — Lanza BadRequestException
6. **submit() from APPROVED** — Lanza BadRequestException
7. **submit() triggers auto-approve** — setTimeout de 30s llama a autoApprove
8. **review() approve** — Cambia IN_REVIEW a APPROVED con reviewedAt
9. **review() reject** — Cambia IN_REVIEW a REJECTED con reviewedAt
10. **review() from PENDING** — Lanza BadRequestException
11. **review() from APPROVED** — Lanza BadRequestException
12. **autoApprove() still IN_REVIEW** — Aprueba automáticamente
13. **autoApprove() already reviewed** — No hace nada si ya no está IN_REVIEW

## Scenarios

### getStatus — existing record
```
Given: KYC record exists for userId
When:  getStatus(userId)
Then:  returns the existing record (no create call)
```

### getStatus — no record
```
Given: no KYC record for userId
When:  getStatus(userId)
Then:  creates and returns a PENDING KYC record
```

### submit — from PENDING
```
Given: KYC in PENDING status
When:  submit(userId, "DNI")
Then:  status → IN_REVIEW, documentType → "DNI", submittedAt → now
And:   setTimeout called with 30000ms
```

### submit — from REJECTED
```
Given: KYC in REJECTED status
When:  submit(userId, "PASSPORT")
Then:  status → IN_REVIEW
```

### submit — from IN_REVIEW
```
Given: KYC in IN_REVIEW status
When:  submit(userId, "DNI")
Then:  throws BadRequestException("Cannot submit KYC from status IN_REVIEW")
```

### submit — from APPROVED
```
Given: KYC in APPROVED status
When:  submit(userId, "DNI")
Then:  throws BadRequestException("Cannot submit KYC from status APPROVED")
```

### review — approve
```
Given: KYC in IN_REVIEW status
When:  review(userId, "approve")
Then:  status → APPROVED, reviewedAt → now
```

### review — reject
```
Given: KYC in IN_REVIEW status
When:  review(userId, "reject")
Then:  status → REJECTED, reviewedAt → now
```

### review — from PENDING
```
Given: KYC in PENDING status
When:  review(userId, "approve")
Then:  throws BadRequestException("Cannot review KYC from status PENDING")
```

### review — from APPROVED
```
Given: KYC in APPROVED status
When:  review(userId, "approve")
Then:  throws BadRequestException("Cannot review KYC from status APPROVED")
```

### autoApprove — still IN_REVIEW
```
Given: KYC in IN_REVIEW
When:  autoApprove(userId) called
Then:  status updated to APPROVED with reviewedAt
```

### autoApprove — already reviewed
```
Given: KYC in APPROVED (already reviewed before timer)
When:  autoApprove(userId) called
Then:  no update occurs
```
