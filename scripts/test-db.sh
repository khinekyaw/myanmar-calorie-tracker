#!/bin/sh
# Run the pgTAP tests in supabase/tests/database against the local stack.
# Same tests as `npx supabase test db`, but piped into the database container,
# so it also works when Docker may not mount this folder.
set -u
container="supabase_db_$(sed -n 's/^project_id = "\(.*\)"/\1/p' supabase/config.toml)"
if ! docker exec "$container" true 2>/dev/null; then
  echo "Can't reach the database container $container: is Docker running for this user, and is the stack up (npm run db:start)?"
  docker exec "$container" true 2>&1 | head -1
  exit 1
fi
status=0
for file in supabase/tests/database/*.sql; do
  out=$(docker exec -i "$container" psql -U postgres -d postgres -q -t -A -v ON_ERROR_STOP=1 < "$file" 2>&1)
  if [ $? -ne 0 ] || echo "$out" | grep -qE '^not ok|^# Looks like'; then
    status=1
    echo "FAIL $file"
    echo "$out" | grep -E '^not ok|^#|ERROR'
  else
    echo "ok   $file ($(echo "$out" | grep -c '^ok') tests)"
  fi
done
exit $status
