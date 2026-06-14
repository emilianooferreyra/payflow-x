#!/bin/sh
set -e

npx prisma generate

exec node dist/main.js
