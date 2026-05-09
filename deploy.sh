#!/bin/sh
set -e

WORKSPACE=/home/runner/workspace

echo "==> Running Django migrations..."
cd "$WORKSPACE/Backend/controller"
DJANGO_SETTINGS_MODULE=main_frame_project.settings python manage.py migrate --no-input

echo "==> Starting Django backend on port 8000..."
DJANGO_SETTINGS_MODULE=main_frame_project.settings \
  gunicorn --bind 0.0.0.0:8000 --workers 2 main_frame_project.wsgi:application &

echo "==> Waiting for backend to be ready on port 8000..."
timeout=60
elapsed=0
until python3 -c "import socket; s=socket.create_connection(('127.0.0.1',8000),1); s.close()" 2>/dev/null; do
  if [ "$elapsed" -ge "$timeout" ]; then
    echo "ERROR: Backend did not bind to port 8000 within ${timeout}s"
    exit 1
  fi
  sleep 1
  elapsed=$((elapsed + 1))
  echo "  ... waiting (${elapsed}s)"
done
echo "==> Backend is ready."

echo "==> Starting unified frontend server on port 5000..."
cd "$WORKSPACE"
node server.js
