# Neon backup and manual failover

## What this setup does

- Copies the application's `public` PostgreSQL schema from Neon to the Supabase project every four days.
- Runs one small Supabase query each day to reduce the chance that the Free project is paused for inactivity. Supabase does not guarantee that activity will prevent a pause.
- Keeps the newest successful snapshot in Supabase. The scheduled restore is transactional; a failed restore leaves the previous snapshot in place.
- Displays Neon transfer usage to the General Manager and warns at 4 GB against the 5 GB threshold.
- Uses Supabase only after an operator deliberately changes the Worker database secret. It does not automatically switch databases.

The backup can be up to four days old. During a Neon outage, changes made after that snapshot will not be present until they are recovered separately.

## One-time setup

### GitHub Actions secrets

In the repository settings, add these Actions secrets without putting their values in the repository:

- `DARK_CRM_NEON_URL`: Neon connection string used only by the backup job.
- `DARK_CRM_SUPABASE_URL`: Supabase session-pooler connection string for project `velkoehtnbelqwydtvix` in `eu-central-1`.

Use the Supabase session pooler, with a username in the form `postgres.<project-ref>`. The job checks the source and target hosts before it runs.

After committing this workflow and adding both secrets, run **Actions → Neon to Supabase free backup → Run workflow** with `run_backup` enabled. Confirm the run succeeds and that the public relation counts match before treating the snapshot as usable.

### Cloudflare Neon usage counter

Add a Neon API key as the Worker secret `NEON_API_KEY`. The project ID is already configured as a non-secret variable. The key is used by a General Manager-only endpoint to read the current project usage indicator.

## Manual failover

1. Check the latest successful backup run and its completion time. If Supabase is paused, resume it in the Supabase dashboard first.
2. In Cloudflare, open Worker `dark-crm` and replace the `DATABASE_URL` secret with the Supabase session-pooler connection string. Keep the Supabase endpoint and credential private.
3. Deploy a new Worker version and check the application's health and key workflows.
4. Keep Neon as the source of truth only until the failover is declared. Once writes have started in Supabase, do not switch `DATABASE_URL` back to Neon without reconciling those writes.

## Returning to Neon

Before switching back, pause application writes or put the app into maintenance mode, compare the data written in Supabase since failover, and migrate/reconcile it into Neon. Verify the migrated data and then update `DATABASE_URL` back to Neon in Cloudflare and deploy. This repository does not automate failback or merge writes from both databases.

## Cost and availability notes

The backup uses the existing Free Supabase project and a scheduled GitHub Actions job; it does not create a paid database resource. Free-plan availability is best effort: Supabase may pause an inactive project, and scheduled GitHub jobs may be delayed. Keep an eye on the latest backup status and the Neon usage card.
