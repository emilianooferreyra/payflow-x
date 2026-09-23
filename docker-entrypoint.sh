#!/bin/sh
set -e

# Migrations run before the app accepts traffic. The schema and the migration
# history must agree — see the sync migration for what happens when they drift.
echo "Applying database migrations..."
npx prisma migrate deploy

exec node dist/main.js
