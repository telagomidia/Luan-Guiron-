#!/usr/bin/env bash
set -euo pipefail
repo_root="$(pwd)"
qa_root="$(mktemp -d)"
trap 'supabase stop --workdir "$qa_root" --no-backup >/dev/null 2>&1 || true' EXIT
supabase init --workdir "$qa_root"
python3 - "$qa_root/supabase/config.toml" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]);s=p.read_text().replace('enable_confirmations = false','enable_confirmations = true');p.write_text(s)
PY
supabase start --workdir "$qa_root" -x studio,realtime,logflare,vector,supavisor,edge-runtime,imgproxy,postgres-meta > "$qa_root/start.log" 2>&1 || { tail -n 30 "$qa_root/start.log"; exit 1; }
supabase status --workdir "$qa_root" -o json > "$qa_root/status.json"
qa_db_url="$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print(d.get("DB_URL") or d["db_url"])' "$qa_root/status.json")"
# A disposable database is the only target. No project URL or production credentials are read.
case "$qa_db_url" in postgresql://postgres:postgres@127.0.0.1:*|postgresql://postgres:postgres@localhost:*) ;; *) echo 'Refusing non-local QA database'; exit 1;; esac
psql "$qa_db_url" -v ON_ERROR_STOP=1 -f tests/db/pre-review-schema.sql >/dev/null
psql "$qa_db_url" -v ON_ERROR_STOP=1 -c "INSERT INTO storage.buckets(id,name) VALUES ('assessment-documents','assessment-documents'),('assessment-docs','assessment-docs'),('progress-photos','progress-photos') ON CONFLICT(id) DO NOTHING;" >/dev/null
for file in supabase/migrations/20261030*.sql; do psql "$qa_db_url" -v ON_ERROR_STOP=1 -f "$file" >/dev/null; done
for file in tests/*-rls.sql; do psql "$qa_db_url" -v ON_ERROR_STOP=1 -f "$file" >/dev/null; done
psql "$qa_db_url" -v ON_ERROR_STOP=1 -c "NOTIFY pgrst, 'reload schema';" >/dev/null
node tests/db/auth-roundtrip.mjs "$qa_root/status.json"
