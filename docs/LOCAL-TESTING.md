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

`npm run test:backup` uses in-memory fixtures only. It does not read a real backup, connect to a database, or prove that an actual restore works.

Database credentials previously embedded in diagnostic scripts must be rotated in Neon and replaced in local environment files. Removing them from the working tree does not remove them from prior Git history.
