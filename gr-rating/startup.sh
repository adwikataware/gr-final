#!/bin/sh
set -e

echo "Running database migrations..."
python -m alembic upgrade head

echo "Enriching researchers from OpenAlex..."
python scripts/enrich_researchers.py || echo "Enrichment skipped (may already be done)"

echo "Starting API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8080 --workers 4
