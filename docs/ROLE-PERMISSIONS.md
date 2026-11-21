# Role and access matrix

This matrix records the current application guards. `DATA_ENTRY` is deliberately
not an accepted role; user creation rejects it until its permissions are decided.

| Role | Customer records | Import / assignment / bulk actions | Properties and projects | Deals and reports | HR / commissions | Accounting | Users, settings, audit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| General Manager | All | Import, reassign, bulk actions, deletion | Read/write; approve public listings | All | Read | Read/write | Read/write |
| Sales Manager | All | Import, reassign, bulk actions; no customer deletion | Read/write; request public listing | Read/write; team reports | No access | No access | No access |
| Sales Employee | Assigned customers only | No import, reassignment, bulk actions, or deletion | Read; no property writes | Own deals only; no team reports | No access | No access | Own profile only |
| HR Manager | No access | No access | No access | No access | Read employee and commission views; no commission write | No access | HR user list read only |
| Accounting Manager | No access | No access | No access | No access | Read commission view | Read/write | No access |
| Data Entry Role | Disabled | Disabled | Disabled | Disabled | Disabled | Disabled | Disabled |

## Enforcement notes

- Session identity and active role are reloaded from the database on each server
  request; token role claims are not trusted.
- Customer APIs use `requireCustomerAccess`; sales employees are scoped by
  `assignedToId`. Customer update rechecks assignment inside its transaction.
- Import, assignment, and bulk actions are manager-only; customer deletion and
  user/account changes are General Manager-only. Property deletion is available
  to both sales manager roles.
- Sales Employees can close deals only for customers currently assigned to
  themselves; the assignment is checked again inside the deal transaction.
- HR and accounting routes are separate role groups. Commission reads are shared
  with HR and accounting; commission writes require General Manager or Accounting.
- Page navigation visibility is not authorization. Each page/API must keep its
  own server-side guard. This matrix reflects the current code and must be kept
  in sync during route review.

## Public listings

Properties remain private unless a Sales Manager requests publication (`PENDING`)
and the General Manager sets `customData.publicListing` to `APPROVED` through
`PATCH /api/properties/:id`, explicitly selecting fields from the allowlist in
`src/lib/public-listings.ts`. Publication metadata is not
accepted from property create/update requests. The public pages return only the
allowlisted DTO. Price, installments, exact floor/unit/building data, and other
internal fields are omitted unless a listed field is explicitly approved; unit,
building, owner, and customer identifiers are never in the public allowlist.
