#!/bin/bash

# Database Backup Script

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.gz"

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo "📦 Creating backup directory..."
mkdir -p "$BACKUP_DIR"

echo "💾 Backing up database..."

# MongoDB backup using mongodump
if command -v mongodump &> /dev/null; then
    mongodump --uri="$MONGODB_URI" --archive="$BACKUP_FILE" --gzip
    echo "✅ Backup completed: $BACKUP_FILE"

    # Keep only last 7 backups
    echo "🗑️  Cleaning old backups..."
    ls -t "$BACKUP_DIR"/backup_*.gz | tail -n +8 | xargs -r rm

    echo "📊 Available backups:"
    ls -lh "$BACKUP_DIR"/backup_*.gz
else
    echo "❌ Error: mongodump not found. Please install MongoDB tools."
    exit 1
fi
