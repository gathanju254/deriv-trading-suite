#!/bin/bash
# backend/start.sh

echo "🚀 Starting Deriv Trading Backend..."
echo "📊 Environment: $ENVIRONMENT"

# Wait for database to be ready (important for Render)
echo "⏳ Waiting for database..."
sleep 2

# Run database migrations if needed
# python -m alembic upgrade head

# Start the application
exec uvicorn src.main:app --host 0.0.0.0 --port 8000 --log-level info