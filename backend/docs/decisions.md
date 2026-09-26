# Decisions

- One HR Manager configured by `HR_EMAIL` and a scrypt password hash meets the single-persona assessment; a user administration API is out of scope. Sessions are stored in PostgreSQL so logout revokes a token even across server processes.
- Employee deletion is termination (`employmentStatus=TERMINATED`). The PATCH endpoint can reactivate. Salary writes are forbidden while terminated; salary history remains readable.
- Annual salary is an exact `numeric(14,2)` amount represented as a JSON string, with a currency code. API checks minor units from the currency table. No payroll frequency conversion is performed.
- One current salary is the record with `endDate=null`; a new effective date closes the prior interval exclusively. Backdated dates earlier than the current record are rejected, avoiding silent history edits.
- Analytics include only active employees with a current salary for monetary figures. Separate total, active and terminated headcounts expose coverage. Conversion uses seeded static rates; they are illustrative, not current market values.
- Unknown query fields and unknown body fields are rejected. Empty query string values are ignored by the established list and analytics parser. Pagination uses a stable `id` tie breaker.
