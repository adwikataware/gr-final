#!/bin/sh

echo "Running database migrations..."
# Stamp to the initial migration if alembic_version table is missing
# This handles the case where tables were created manually without alembic
python -m alembic upgrade head || {
    echo "Migration failed, attempting to stamp and retry..."
    python -m alembic stamp 79803942b7ff 2>/dev/null || python -m alembic stamp head
    python -m alembic upgrade head || echo "Migration warning: continuing anyway"
}

echo "Importing 100 researchers from OpenAlex..."
python scripts/import_researchers.py || echo "Import skipped"

echo "Starting API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8080 --workers 4
