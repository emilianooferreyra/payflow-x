# EmailsService — Unit Tests

## Requirements

1. **sendEmail() success** — Envía un email vía Resend SDK con from, to, subject, html
2. **sendEmail() failure** — Resend lanza error → se captura, se loguea, se lanza BadRequestException
3. **sendBatchEmail() success** — Envía múltiples emails vía Resend batch.send
4. **sendBatchEmail() failure** — Resend batch lanza error → BadRequestException

## Scenarios

### sendEmail — success
```
Given: Resend.emails.send resolves successfully
When:  sendEmail({ to: "user@test.com", subject: "Welcome", html: "<p>Hi</p>" })
Then:  resend.emails.send called with:
         from: "Payflow-x <noreply@payflow.com>"
         to: "user@test.com"
         subject: "Welcome"
         html: "<p>Hi</p>"
       returns the Resend response
```

### sendEmail — Resend throws
```
Given: Resend.emails.send rejects with error
When:  sendEmail({ to: "user@test.com", subject: "Welcome", html: "<p>Hi</p>" })
Then:  logs warning with error message
       throws BadRequestException("Failed to send email to user@test.com")
```

### sendBatchEmail — success
```
Given: Resend.batch.send resolves successfully
When:  sendBatchEmail([
         { to: "a@test.com", subject: "A", html: "<p>A</p>" },
         { to: "b@test.com", subject: "B", html: "<p>B</p>" }
       ])
Then:  resend.batch.send called with array of 2 emails with from prepended
       returns the Resend response
```

### sendBatchEmail — Resend throws
```
Given: Resend.batch.send rejects with error
When:  sendBatchEmail([{ to: "a@test.com", subject: "A", html: "<p>A</p>" }])
Then:  logs warning
       throws BadRequestException("Failed to send batch email")
```
