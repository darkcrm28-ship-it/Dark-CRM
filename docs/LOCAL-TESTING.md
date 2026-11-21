# Local database testing

Database-backed test and diagnostic scripts must use `.env.test`, which is ignored by Git. Create it from `.env.test.example` and configure `DATABASE_URL` and `DIRECT_URL` for the same dedicated Neon test branch. Use a test-only `JWT_SECRET` of at least 32 characters.

The scripts load `.env.test` through `scripts/load-test-env.js` and stop before opening a connection when that file is missing, either URL is invalid, the two URLs identify different Neon branches, or the test database target matches `.env`, `.env.production`, or an inherited `DATABASE_URL`.

Guarded database scripts:

- `npm test`
- `npm run test:security`
- `test-pg.js`
- `check-tables.js`
- `check-columns.js`
- `check-counts.js`
- `check_db.ts`

`npm run test:backup` currently uses in-memory fixtures only. It does not read a real backup, connect to a database, or prove that an actual restore works. Do not treat that command as evidence of a recoverable backup. A real backup/restore drill requires a separately provisioned test branch and must restore only into an isolated disposable test database; never target production.

## Release gate status

The repository contains `.env.test.example`, not a configured `.env.test`. A real
database isolation check and backup/restore drill are blocked until a dedicated
Neon test branch is provisioned and `.env.test` points both URLs to that branch.
The database test loader refuses matching `.env`, `.env.production`, and
inherited targets before opening a connection. Keep the branch ID and restore
timestamp in the operational runbook after the drill is performed.

## Environment and restore procedure

1. Create a dedicated Neon branch for testing, clearly marked as a test branch.
   Use its pooled and direct connection strings only in `.env.test`.
2. Copy `.env.test.example` to `.env.test`, replace the placeholders, and set a
   unique test-only `JWT_SECRET` (at least 32 characters). Never copy a
   production URL into this file.
3. Run `npm test` or `npm run test:security`. Database-backed commands must stop
   before connecting when the test configuration is missing or matches another
   configured target.
4. For a restore drill, take a backup/snapshot of the isolated test branch using
   the database provider, restore it to a second disposable test branch/database,
   point both `.env.test` URLs at that restore target, then run integrity and
   security checks there. Record source branch, restore target, timestamp, tool
   result, and check output. Do not restore over the source branch or production.

The current `test:backup` command uses in-memory fixtures and does not implement
steps 1–4. No real restore drill has been completed yet.

Database credentials previously embedded in diagnostic scripts must be rotated in Neon and replaced in local environment files. Removing them from the working tree does not remove them from prior Git history.
