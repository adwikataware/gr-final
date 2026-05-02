#!/bin/sh

echo "Running database migrations..."
# Stamp to the initial migration if alembic_version table is missing
# This handles the case where tables were created manually without alembic
python -m alembic upgrade head || {
    echo "Migration failed, attempting to stamp and retry..."
    python -m alembic stamp 79803942b7ff 2>/dev/null || python -m alembic stamp head
    python -m alembic upgrade head || echo "Migration warning: continuing anyway"
}

echo "Removing extra researchers (keeping only seed + onboarded)..."
python cleanup_extra_researchers.py || echo "Cleanup skipped"

echo "Applying affiliation overrides..."
python fix_affiliations.py || echo "Affiliation fix skipped"

echo "Recalculating GR scores with updated thresholds..."
python recalculate_gr.py || echo "GR recalculation skipped"

echo "Starting API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8080 --workers 4
