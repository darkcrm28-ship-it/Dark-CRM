#!/bin/sh
set -eu
set +x

: "${DARK_CRM_NEON_URL:?Set the Neon source database URL in GitHub Actions secrets.}"
: "${DARK_CRM_SUPABASE_URL:?Set the Supabase session-pooler database URL in GitHub Actions secrets.}"
: "${SUPABASE_PROJECT_REF:?Set the expected Supabase project ref.}"

url_authority() {
  value=${1#*://}
  value=${value%%/*}
  value=${value%%\?*}
  printf '%s' "$value"
}

url_host() {
  authority=$(url_authority "$1")
  host_port=${authority##*@}
  printf '%s' "${host_port%%:*}"
}

neon_host=$(url_host "$DARK_CRM_NEON_URL")
case "$neon_host" in
  *.neon.tech) ;;
  *) echo "Backup stopped: source must be a Neon endpoint." >&2; exit 2 ;;
esac

target_authority=$(url_authority "$DARK_CRM_SUPABASE_URL")
target_userinfo=${target_authority%@*}
target_user=${target_userinfo%%:*}
target_host=$(url_host "$DARK_CRM_SUPABASE_URL")
case "$target_host" in
  "db.${SUPABASE_PROJECT_REF}.supabase.co") ;;
  *.pooler.supabase.com)
    if [ "$target_user" != "postgres.${SUPABASE_PROJECT_REF}" ]; then
      echo "Backup stopped: the Supabase pooler username does not match the expected project." >&2
      exit 2
    fi
    ;;
  *) echo "Backup stopped: target is not the configured Supabase project." >&2; exit 2 ;;
esac

# A tiny database query runs several times a day to reduce the chance that the
# free Supabase project is paused for inactivity. Free-tier providers do not
# guarantee that this prevents pausing.
psql "$DARK_CRM_SUPABASE_URL" -XAtw -v ON_ERROR_STOP=1 -c 'SELECT 1' >/dev/null 2>&1 || {
  echo "Supabase keep-alive query failed; no backup was attempted." >&2
  exit 1
}

if [ "${RUN_BACKUP:-false}" != "true" ]; then
  echo "Supabase keep-alive succeeded; no backup was requested by this schedule."
  exit 0
fi

archive=$(mktemp)
toc=$(mktemp)
trap 'rm -f "$archive" "$toc"' EXIT HUP INT TERM
chmod 600 "$archive" "$toc"

if ! pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --schema=public \
  --exclude-extension=pg_session_jwt \
  --dbname="$DARK_CRM_NEON_URL" \
  --file="$archive" >/dev/null 2>&1; then
  echo "Neon dump failed; the previous Supabase snapshot was left unchanged." >&2
  exit 1
fi

if ! pg_restore --list "$archive" >/dev/null 2>&1; then
  echo "Neon dump verification failed; the previous Supabase snapshot was left unchanged." >&2
  exit 1
fi

# Keep Supabase's built-in public schema; replace only the application's
# objects from Neon's public schema. Restore in one transaction so a failed
# import rolls back and retains the previous snapshot.
if ! pg_restore --list "$archive" | sed '/ SCHEMA - public /d' > "$toc"; then
  echo "Could not prepare the restore manifest; the previous snapshot was left unchanged." >&2
  exit 1
fi

if ! pg_restore \
  --use-list="$toc" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  --single-transaction \
  --dbname="$DARK_CRM_SUPABASE_URL" \
  "$archive" >/dev/null 2>&1; then
  echo "Supabase restore failed and was rolled back; the previous snapshot remains available." >&2
  exit 1
fi

source_count=$(psql "$DARK_CRM_NEON_URL" -XAtw -v ON_ERROR_STOP=1 \
  -c "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','f')" 2>/dev/null)
target_count=$(psql "$DARK_CRM_SUPABASE_URL" -XAtw -v ON_ERROR_STOP=1 \
  -c "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','f')" 2>/dev/null)
if [ "$source_count" != "$target_count" ]; then
  echo "Backup restored, but public relation counts differ; review the destination before failover." >&2
  exit 1
fi

echo "Four-day Neon to Supabase backup completed and public relation counts match."

