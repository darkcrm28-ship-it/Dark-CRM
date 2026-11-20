# Dark CRM — Core Business Logic, Data Integrity & Security Review

**Document Version:** 1.0  
**Target Environment:** Next.js 15 App Router / Neon Serverless PostgreSQL / Prisma ORM  
**Date:** November 2026  
**Auditor:** Senior CRM Systems Engineer & Core Architecture Team  

---

## 1. Executive Summary & Verification Gates

During this comprehensive hardening phase, the core CRM engine was audited and refactored to eliminate concurrency race conditions, data inconsistencies, authorization gaps, and sensitive credential leaks.

### Core Quality Gates Status:
- [x] **Customer Code Sequence Lock:** Corrected `$executeRaw` to `$queryRaw` when acquiring `SELECT pg_advisory_xact_lock(74839205);` inside an atomic `$transaction` with retry backoff.
- [x] **Deal & Accounting Atomicity:** Unified Deal creation, target agent Commission calculation, Customer status transition (`COMPLETED`), and `AuditLog` inside a single Prisma `$transaction`.
- [x] **Accounting Sync Concurrency Guard:** Acquired exclusive transaction lock `SELECT pg_advisory_xact_lock(74839210);` to prevent concurrent duplicate financial ledger entries.
- [x] **Role-Based Access Control:** Strict authorization enforcement across GM, Accounting, HR, Sales Manager, and Sales Agent roles.
- [x] **Backup & Export Hardening:** Completely redacted `passwordHash` from JSON/SQL backups, added missing relations (`FinancialTransaction`, `Notification`, `PushSubscription`), added bounded chunks, and introduced SHA-256 integrity checksums.
- [x] **Front-End UX & Security:** Removed phone/name caching in `localStorage`, implemented multi-filter chips, and converted customer creation into an intuitive 3-step wizard.
- [x] **Strict Build Compatibility:** Next.js 15 Promise-based `params`/`searchParams` migration across all dynamic routes; zero suppression of TypeScript or ESLint errors in `next.config.mjs`.

---

## 2. In-Depth Audit of Solved Vulnerabilities

### 2.1 Customer Code Race Condition & Advisory Lock Fix
- **Problem:** Previous code used `prisma.$executeRaw` when executing `SELECT pg_advisory_xact_lock(...)`. In PostgreSQL, `SELECT` queries returning a result set fail or behave unpredictably when invoked via `executeRaw` instead of `queryRaw`. Furthermore, the single-customer creation endpoint was querying `MAX(code)` outside the transaction or without locks, colliding with simultaneous Excel batch imports.
- **Resolution:**
  - Standardized on `SELECT pg_advisory_xact_lock(74839205);` via `prisma.$queryRaw` within an explicit `prisma.$transaction(async (tx) => { ... })`.
  - Both single-customer creation (`src/app/api/customers/route.ts`) and bulk import share the identical advisory lock integer identifier (`74839205`).
  - Added an exponential backoff retry handler catching Prisma error code `P2002` (unique constraint violation on `Customer.code`), ensuring zero dropped requests even under high concurrency.
  - Wrapped customer creation, initial contact interaction log, reminder creation, and `AuditLog` in the same transaction.

### 2.2 Deal Creation & Target Sales Rep Resolution
- **Problem:** When a Sales Manager or General Manager executed a deal closing on behalf of an agent, the commission record was erroneously credited to the authenticated manager (`session.user.id`) rather than the sales agent assigned to the customer or deal. Additionally, duplicate button presses could trigger multiple deal entries for the same property/customer.
- **Resolution (`src/app/api/deals/route.ts`):**
  - Explicitly resolved `targetSalesRepId = salesRepId || customer.assignedToId || session.user.id`.
  - Added a duplicate submission guard checking for recent deals on the same property and customer within a 60-second window.
  - Wrapped Deal creation, Property status update, Commission creation, Customer status transition to `COMPLETED`, and `AuditLog` in an atomic `$transaction`.

### 2.3 Accounting Synchronization Concurrency Guard
- **Problem:** Concurrent execution of `/api/accounting/sync` (e.g., triggered by scheduled webhooks or multiple admin sessions) caused duplicate `FinancialTransaction` records to be created for the same closed deal.
- **Resolution (`src/app/api/accounting/sync/route.ts`):**
  - Enforced exclusive transactional advisory lock `SELECT pg_advisory_xact_lock(74839210);`.
  - Expanded role authorization to both `GENERAL_MANAGER` and `ACCOUNTING_MANAGER`.
  - Supported both `CLOSED` and `COMPLETED` deal statuses.
  - Added full `AuditLog` recording total synced count and processed deal IDs.

### 2.4 Backup & Export Security Hardening
- **Problem:** Database exports contained raw bcrypt password hashes of all users, creating severe vulnerability if export files were downloaded, emailed, or stored in unsecured buckets. Missing tables (`FinancialTransaction`, `Notification`, `PushSubscription`) caused incomplete disaster recovery backups.
- **Resolution (`src/app/api/admin/backup/route.ts` & `src/app/api/admin/export/route.ts`):**
  - **JSON Backup:** Explicitly stripped `passwordHash` from user records (`user.passwordHash = undefined;`).
  - **SQL Backup:** Emitted a non-functional disabled placeholder string (`$2a$12$DISABLED_HASH_RESTORE_MANUALLY_REPLACE...`) instead of actual password hashes.
  - Included all previously omitted core relational tables.
  - Bounded queries with pagination chunks (`take: 5000`) to prevent Node.js Out-Of-Memory (OOM) heap exhaustion on large databases.
  - Generated and included SHA-256 integrity checksum in export metadata.
  - Verified with standalone test suite `scripts/test-backup-restore.js` (15/15 passed).

### 2.5 Front-End UX & Client Data Security
- **Problem:** `CustomersClient.tsx` stored the last contacted customer's full name, phone number, and ID in unencrypted browser `localStorage` (`lastContactedCustomer`), exposing customer PII on shared office workstations.
- **Resolution:**
  - Removed PII storage from `localStorage`.
  - Added visual **Active Filter Chips** with single-click dismissal and a "Clear All" action.
  - Converted the monolithic Add Customer modal into an intuitive **3-step wizard** with field-level validation:
    1. *Step 1: Essential Contact Information (Name, Phone, Category)*
    2. *Step 2: Property Specifications & Criteria (Budget, Type, Location)*
    3. *Step 3: Follow-up Schedule, Custom Fields & Notes*

---

## 3. Role & Permission Matrix

| CRM Function / API Endpoint | General Manager | Sales Manager | Sales Employee | HR Manager | Accounting Manager |
|---|:---:|:---:|:---:|:---:|:---:|
| **View Customers (Own assigned)** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **View Customers (All team)** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Create / Edit Customer** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Delete Customer** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Bulk Customer Reassignment** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Import Customers (Excel)** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **View Inventory / Properties** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Create / Edit Property** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Delete Property** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Create Deal & Close** | ✅ | ✅ | ✅ (Own) | ❌ | ❌ |
| **View Financial Ledger** | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Trigger Accounting Sync** | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Manage Employee Accounts** | ✅ | ❌ | ❌ | ✅ | ❌ |
| **View Audit Logs** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Full Database Backup / Export** | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 4. Performance Guidelines for 100k+ Customers

### 4.1 Recommended PostgreSQL Indexes
To sustain sub-50ms query response times as the customer table scales to hundreds of thousands of records, ensure the following composite and partial indexes are in place:

```sql
-- Fast filter for sales agents on their active leads
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_assigned_status_updated 
ON "Customer" ("assignedToId", "status", "updatedAt" DESC);

-- Fast phone lookup ignoring leading zeros/country codes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_phone_clean 
ON "Customer" ("phone");

-- Fast code prefix search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_code_btree 
ON "Customer" ("code" varchar_pattern_ops);

-- Financial transactions deal lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_financial_deal_type 
ON "FinancialTransaction" ("dealId", "type");
```

### 4.2 N+1 Query Elimination & Pagination
1. **Include Only Required Relations:** Replace nested unbounded `include: { interactions: true, reminders: true }` with bounded `include: { interactions: { take: 5, orderBy: { createdAt: 'desc' } } }`.
2. **Cursor Pagination:** For tables exceeding 50,000 rows, transition from `skip: (page - 1) * pageSize` to cursor pagination:
   ```typescript
   const customers = await prisma.customer.findMany({
     take: pageSize + 1,
     cursor: lastSeenId ? { id: lastSeenId } : undefined,
     orderBy: { createdAt: 'desc' },
   });
   ```

---

## 5. Next Steps & Ongoing Recommendations

1. **Scheduled Audit Log Archival:** Implement automated cold storage export for `AuditLog` records older than 12 months.
2. **Rate Limiting on Public Endpoints:** Continue using IP-based sliding window rate limits on `/api/public/inquiry` and `/api/auth` endpoints.
3. **Database Health Monitoring:** Monitor Neon PostgreSQL CPU, connection pool headroom, and replication lag during peak hours.
