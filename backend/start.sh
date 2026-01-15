#!/bin/bash
# backend/start.sh

echo "🚀 Starting Deriv Trading Backend..."
echo "📊 Environment: ${ENVIRONMENT:-production}"

# Wait for database to be ready (important for Render)
echo "⏳ Waiting for database (5 seconds)..."
sleep 5

# Test database connection
echo "🔍 Testing database connection..."
python -c "
import sys
from sqlalchemy import create_engine, text
try:
    engine = create_engine('${DATABASE_URL}', pool_pre_ping=True, pool_recycle=300)
    with engine.connect() as conn:
        result = conn.execute(text('SELECT version()'))
        print(f'✅ Connected to PostgreSQL: {result.fetchone()[0]}')
        # Check if tables exist
        result = conn.execute(text(\"SELECT EXISTS(SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trades');\"))
        tables_exist = result.fetchone()[0]
        if not tables_exist:
            print('⚠️ Tables not found, will be created on startup')
except Exception as e:
    print(f'❌ Database connection failed: {e}')
    sys.exit(1)
"

# Optional: run database migrations if RUN_MIGRATIONS is enabled
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "🔁 Running Alembic migrations..."
  python -c "
import sys
from alembic.config import Config
from alembic import command
try:
    alembic_cfg = Config('alembic.ini')
    command.upgrade(alembic_cfg, 'head')
    print('✅ Migrations completed successfully')
except Exception as e:
    print(f'⚠️ Alembic migrations failed: {e}')
    print('⚠️ Falling back to SQLAlchemy create_all()')
"
fi

# Start the application using PORT (Render provides $PORT)
PORT=${PORT:-8000}
echo "🌐 Starting server on port ${PORT}..."
exec uvicorn src.main:app --host 0.0.0.0 --port "${PORT}" --log-level info