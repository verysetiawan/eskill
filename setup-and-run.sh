#!/bin/bash
set -e

PGDIR="/Users/macbook/postgres16"
PGDATA="$PGDIR/data"
PGBIN="$PGDIR/bin"
PGLOG="$PGDIR/postgres.log"
DB_NAME="esuk"
DB_USER="postgres"
DB_PASS="postgres"
SERVER_PORT=3007

echo "========================================"
echo "  ESUK - Setup & Run Script"
echo "========================================"

# ── 1. Check apakah PostgreSQL binary ada ──────────────────────────────────────
if [ ! -f "$PGBIN/postgres" ]; then
  echo ""
  echo "📦 Mengekstrak PostgreSQL binary..."
  mkdir -p "$PGDIR"
  unzip -q /tmp/postgres.zip -d /tmp/pgext
  cp -r /tmp/pgext/pgsql/* "$PGDIR/"
  chmod +x "$PGBIN"/*
  echo "✅ PostgreSQL binary siap di $PGBIN"
fi

# ── 2. Inisialisasi database cluster jika belum ada ────────────────────────────
if [ ! -d "$PGDATA" ]; then
  echo ""
  echo "🗄️  Inisialisasi database cluster..."
  "$PGBIN/initdb" -D "$PGDATA" -U "$DB_USER" --auth=trust --encoding=UTF8 2>&1
  echo "✅ Database cluster diinisialisasi"
fi

# ── 3. Start PostgreSQL jika belum running ─────────────────────────────────────
if ! "$PGBIN/pg_ctl" -D "$PGDATA" status > /dev/null 2>&1; then
  echo ""
  echo "🚀 Menjalankan PostgreSQL..."
  "$PGBIN/pg_ctl" -D "$PGDATA" -l "$PGLOG" start
  sleep 2
  echo "✅ PostgreSQL berjalan"
else
  echo "✅ PostgreSQL sudah berjalan"
fi

# ── 4. Buat database 'esuk' jika belum ada ─────────────────────────────────────
if ! "$PGBIN/psql" -U "$DB_USER" -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  echo ""
  echo "📋 Membuat database '$DB_NAME'..."
  "$PGBIN/createdb" -U "$DB_USER" "$DB_NAME"
  echo "✅ Database '$DB_NAME' dibuat"
else
  echo "✅ Database '$DB_NAME' sudah ada"
fi

# ── 5. Set password untuk user postgres ────────────────────────────────────────
"$PGBIN/psql" -U "$DB_USER" -d "$DB_NAME" -c "ALTER USER $DB_USER PASSWORD '$DB_PASS';" > /dev/null 2>&1 || true

# ── 6. Jalankan server Go ──────────────────────────────────────────────────────
echo ""
echo "🖥️  Menjalankan backend Go..."
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=$DB_USER
export DB_PASSWORD=$DB_PASS
export DB_NAME=$DB_NAME
export DB_SSLMODE=disable
export JWT_SECRET="esuk-jwt-secret-2024"
export PORT=$SERVER_PORT

cd "$(dirname "$0")"

# Build selalu agar perubahan terbaru ikut dijalankan.
echo "⚙️  Build aplikasi ESKILL terbaru..."
GOCACHE="${TMPDIR:-/tmp}/esuk-go-cache" go build -o esuk-server-statusfix .

echo "✅ ESKILL siap di http://127.0.0.1:${SERVER_PORT}"
echo "   Tekan Ctrl+C untuk menghentikan web."
exec ./esuk-server-statusfix
