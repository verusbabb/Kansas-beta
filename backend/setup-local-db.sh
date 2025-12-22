#!/bin/bash

# Setup Local Database for Kansas Beta
# This script creates the database and runs migrations

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🗄️  Setting up local database for Kansas Beta...${NC}"
echo ""

# Try to find psql in common locations
PSQL_CMD=""
if command -v psql &> /dev/null; then
  PSQL_CMD="psql"
elif [ -f "/usr/local/bin/psql" ]; then
  PSQL_CMD="/usr/local/bin/psql"
elif [ -f "/opt/homebrew/bin/psql" ]; then
  PSQL_CMD="/opt/homebrew/bin/psql"
elif [ -f "/Applications/Postgres.app/Contents/Versions/latest/bin/psql" ]; then
  PSQL_CMD="/Applications/Postgres.app/Contents/Versions/latest/bin/psql"
fi

if [ -z "$PSQL_CMD" ]; then
  echo -e "${YELLOW}⚠️  psql command not found in PATH.${NC}"
  echo -e "${BLUE}Attempting to create database via Sequelize migration...${NC}"
  echo ""
  echo -e "${YELLOW}If this fails, please create the database manually:${NC}"
  echo "  createdb -U postgres kansas_beta"
  echo "  # OR"
  echo "  psql -U postgres -c \"CREATE DATABASE kansas_beta;\""
  echo ""
  # Continue anyway - migrations might work if DB exists
else
  echo -e "${BLUE}Found psql at: ${PSQL_CMD}${NC}"
fi

# Get database name from .env or use default
DATABASE_NAME="${DATABASE_NAME:-kansas_beta}"
DATABASE_USER="${DATABASE_USER:-postgres}"

echo -e "${BLUE}Database name: ${DATABASE_NAME}${NC}"
echo -e "${BLUE}Database user: ${DATABASE_USER}${NC}"
echo ""

# Try to create database if psql is available
if [ -n "$PSQL_CMD" ]; then
  # Check if database exists
  DB_EXISTS=$($PSQL_CMD -U "$DATABASE_USER" -lqt 2>/dev/null | cut -d \| -f 1 | grep -w "$DATABASE_NAME" | wc -l || echo "0")
  
  if [ "$DB_EXISTS" -eq "1" ]; then
    echo -e "${GREEN}✅ Database '${DATABASE_NAME}' already exists.${NC}"
  else
    echo -e "${BLUE}Creating database '${DATABASE_NAME}'...${NC}"
    $PSQL_CMD -U "$DATABASE_USER" -c "CREATE DATABASE $DATABASE_NAME;" 2>/dev/null || {
      echo -e "${YELLOW}⚠️  Could not create database via psql.${NC}"
      echo -e "${YELLOW}Please create it manually:${NC}"
      echo "  createdb -U postgres kansas_beta"
      echo "  # OR"
      echo "  psql -U postgres -c \"CREATE DATABASE kansas_beta;\""
      echo ""
      echo -e "${BLUE}Continuing with migrations anyway...${NC}"
    }
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✅ Database created successfully!${NC}"
    fi
  fi
else
  echo -e "${YELLOW}⚠️  Skipping database creation (psql not found).${NC}"
  echo -e "${YELLOW}Please ensure the database '${DATABASE_NAME}' exists before running migrations.${NC}"
  echo ""
fi

echo ""
echo -e "${BLUE}📦 Running database migrations...${NC}"

# Run migrations
npm run migration:run:dev

echo ""
echo -e "${GREEN}✅ Local database setup complete!${NC}"
echo ""
echo -e "${BLUE}You can now start the backend with:${NC}"
echo "  npm run start:dev"

