# Documents & Ownership (first module after Foundation)

## Private document storage

- Files are uploaded to ImageKit with `isPrivateFile=true` through
  `/api/documents` (multipart form: `file`, `entityType`, `entityId`, `type`,
  optional `title` and `accessLevel`).
- Allowed formats: PDF, JPG, PNG, DOCX. Maximum size: 5 MB. The first bytes of
  every upload are checked against the declared MIME type.
- The `Document` row stores the ImageKit `fileId` in `storageKey` and the file
  path in `url`. The raw URL is never returned to the client.
- `/api/documents/[id]` returns a short-lived signed URL (`ik-t` + `ik-s`, 30 s
  to 1 h TTL). `?redirect=1` redirects directly to that signed URL.
- Signing uses HMAC-SHA1 over `relativePath + expiry`, matching ImageKit's
  signed URL algorithm. It is implemented with Web Crypto so it works inside
  the Cloudflare Worker (the ImageKit Node SDK signer needs Node `crypto`).
- Deletion removes the remote file first, then soft-deletes the row.

## Access rules

- Unknown entity types are denied by default.
- Customers and deals are scoped to the assigned sales rep for employees.
- Ownership records are visible to sales managers and accounting only.
- Payment/installment documents are restricted to finance roles and the GM.
- `CONFIDENTIAL` documents never reach non-manager roles.

## Independent owners

- `/api/owners` and `/api/owners/[id]` manage the new `Owner` model.
- `/api/properties/[id]/owners` replaces a property's active ownership set in
  one transaction: a property advisory lock, close the old rows with
  `effectiveTo`, then insert the new current rows.
- Percentages are parsed with `Prisma.Decimal`, must be positive, at most 100,
  unique per owner, and must sum exactly to 100. The database trigger adds a
  second line of defence against totals above 100.
- The legacy `PropertyOwnership` model (customer-based sellers) is untouched.
- The existing `/dashboard/owners` page still means "sellers"; a separate page
  is needed for independent property owners.
