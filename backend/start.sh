#!/bin/bash
# backend/start.sh - Enhanced version with better diagnostics and Alembic logging

echo "===================================================================="
echo "🚀 Starting Deriv Trading Backend"
echo "===================================================================="
echo "📊 Environment: ${ENVIRONMENT:-production}"
echo "📊 Build timestamp: $(date)"
echo "--------------------------------------------------------------------"

# Function to check package with fallback
check_package() {
    local package_name=$1
    local import_name=$2
    local version_cmd=$3
    
    echo -n "🔍 $package_name: "
    python -c "
try:
    import $import_name
    $version_cmd
except ImportError:
    print('❌ NOT INSTALLED')
except Exception as e:
    print(f'⚠️ ERROR: {str(e)[:50]}')
" 2>/dev/null || echo "❌ CHECK FAILED"
}

# Comprehensive version checks
echo "📦 Package versions:"
check_package "Python" "sys" "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')"
check_package "PostgreSQL" "psycopg2" "print(psycopg2.__version__)"
check_package "SQLAlchemy" "sqlalchemy" "print(sqlalchemy.__version__)"
check_package "scikit-learn" "sklearn" "print(sklearn.__version__)"
check_package "FastAPI" "fastapi" "print(fastapi.__version__)"
check_package "NumPy" "numpy" "print(numpy.__version__)"
check_package "Pandas" "pandas" "print(pandas.__version__)"

echo "--------------------------------------------------------------------"

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
for i in {1..10}; do
    python -c "
import sys
from sqlalchemy import create_engine, text
try:
    engine = create_engine('${DATABASE_URL}', pool_pre_ping=True, pool_recycle=300, connect_args={'connect_timeout': 5})
    with engine.connect() as conn:
        result = conn.execute(text('SELECT version()'))
        version = result.fetchone()[0]
        print(f'✅ PostgreSQL: {version}')
        sys.exit(0)
except Exception as e:
    if i < 10:
        sys.exit(1)
    else:
        print(f'❌ Database connection failed after 10 attempts: {e}')
        sys.exit(1)
" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ Database connection established"
        break
    else
        echo "⏳ Attempt $i/10 failed, retrying in 2 seconds..."
        sleep 2
    fi
done

# Check for existing tables
echo "📊 Checking database schema..."
python -c "
import sys
from sqlalchemy import create_engine, text
try:
    engine = create_engine('${DATABASE_URL}')
    with engine.connect() as conn:
        tables = ['users', 'trades', 'contracts', 'proposals', 'commissions', 'user_sessions']
        for table in tables:
            result = conn.execute(text(f\"SELECT EXISTS(SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '{table}');\"))
            exists = result.fetchone()[0]
            status = '✅' if exists else '⚠️'
            print(f'{status} Table {table}: {'Found' if exists else 'Missing'}')
        
        if not all([conn.execute(text(f\"SELECT EXISTS(SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '{table}');\")).fetchone()[0] for table in tables]):
            print('📝 Some tables missing, will be created on startup')
except Exception as e:
    print(f'⚠️ Schema check failed: {e}')
" 2>/dev/null

echo "--------------------------------------------------------------------"

# Run migrations if enabled
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
    echo "🔁 Running Alembic migrations..."
    if [ -f "alembic.ini" ]; then
        python - <<EOF
import sys
from alembic.config import Config
from alembic import command
from alembic.script import ScriptDirectory

try:
    alembic_cfg = Config('alembic.ini')
    script = ScriptDirectory.from_config(alembic_cfg)

    # Show current revision and head
    current = command.current(alembic_cfg, verbose=True)
    head = script.get_current_head()
    print("🔹 Current DB revision:", current)
    print("🔹 Latest revision (head):", head)

    # Upgrade to head
    command.upgrade(alembic_cfg, 'head')

    # List applied migrations after upgrade
    print("✅ Applied migrations:")
    for rev in script.walk_revisions(base='base', head='head'):
        print(f"  - {rev.revision}: {rev.doc}")

except Exception as e:
    print(f'⚠️ Alembic migration failed: {e}')
EOF
    else
        echo "⚠️ alembic.ini not found, skipping migrations"
    fi
fi

# Start the application
PORT=${PORT:-8000}
echo "===================================================================="
echo "🌐 Starting FastAPI server on port ${PORT}"
echo "⏱️ Server start time: $(date)"
echo "===================================================================="

exec uvicorn src.main:app --host 0.0.0.0 --port "${PORT}" --log-level info
