#!/bin/bash
# Post-merge setup
# ----------------
# Runs after a task is merged into main. Idempotent — safe to retry.
set -e

echo ">>> [post-merge] Installing Python deps"
pip install -q -r requirements.txt 2>/dev/null || pip install -q -r Backend/requirements.txt 2>/dev/null || true

echo ">>> [post-merge] Applying Django migrations"
python Backend/controller/manage.py migrate --noinput

echo ">>> [post-merge] Installing frontend deps"
if [ -f Frontend/portfolioResume/package.json ]; then
  ( cd Frontend/portfolioResume && npm install --no-audit --no-fund --prefer-offline --silent ) || true
fi

echo ">>> [post-merge] Done"
