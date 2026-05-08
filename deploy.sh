#!/bin/sh
set -e

WORKSPACE=/home/runner/workspace

echo "==> Running Django migrations..."
cd "$WORKSPACE/Backend/controller"
python manage.py migrate --no-input

echo "==> Starting Django backend on port 8000..."
gunicorn --bind 0.0.0.0:8000 --workers 2 --daemon \
  --log-file "$WORKSPACE/gunicorn.log" \
  --access-logfile "$WORKSPACE/gunicorn-access.log" \
  main_frame_project.wsgi:application

echo "==> Starting unified frontend server on port 5000..."
cd "$WORKSPACE"
node server.js
