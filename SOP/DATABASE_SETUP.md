# Database Setup Guide

## Quick Start

You already have PostgreSQL 18.1 installed! We'll use Docker Desktop to run it in a container for easy management.

---

## Step 1: Start PostgreSQL with Docker

### Using Docker Compose (Recommended):

1. **Make sure Docker Desktop is running**

2. **Navigate to project root and start database:**
   ```bash
   docker-compose up -d
   ```

3. **Verify it's running:**
   ```bash
   docker ps
   ```
   
   You should see `dreamfinora_postgres` container running.

4. **Check logs (if needed):**
   ```bash
   docker-compose logs postgres
   ```

---

## Step 2: Connect to Database

### Connection Details:

**From your application:**
```
DATABASE_URL="postgresql://dreamfinora:dreamfinora_dev_password_change_in_production@localhost:5432/dreamfinora_dev"
```

**Using psql command line:**
```bash
psql -h localhost -U dreamfinora -d dreamfinora_dev
```

**Password:** `dreamfinora_dev_password_change_in_production`

---

## Step 3: Useful Commands

### Docker Compose Commands:

```bash
# Start database
docker-compose up -d

# Stop database (keeps data)
docker-compose stop

# Stop and remove containers (keeps data)
docker-compose down

# Stop and remove everything including data
docker-compose down -v

# View logs
docker-compose logs -f postgres

# Restart database
docker-compose restart postgres
```

### PostgreSQL Commands:

```bash
# Connect via psql
psql -h localhost -U dreamfinora -d dreamfinora_dev

# List all databases
psql -h localhost -U dreamfinora -c "\l"

# List all tables (after Prisma setup)
psql -h localhost -U dreamfinora -d dreamfinora_dev -c "\dt"
```

---

## Step 4: Environment Variables

Create a `.env` file in the `apps/backend` directory:

```env
DATABASE_URL="postgresql://dreamfinora:dreamfinora_dev_password_change_in_production@localhost:5432/dreamfinora_dev?schema=public"
```

**⚠️ Important:** 
- Never commit `.env` files to Git!
- Change password for production
- The `.env` file is in `.gitignore`

---

## Step 5: Using Prisma (Day 4)

Once Prisma is set up:

```bash
# Generate Prisma Client
npx prisma generate

# Create a migration
npx prisma migrate dev --name init

# View database in Prisma Studio (GUI)
npx prisma studio
```

---

## Troubleshooting

### "Port 5432 already in use"

**Solution:** PostgreSQL might already be running outside Docker.

**Option 1:** Stop local PostgreSQL service
```bash
# Windows
net stop postgresql-x64-18

# Or change port in docker-compose.yml:
ports:
  - "5433:5432"  # Use 5433 instead
```

**Option 2:** Use different port in docker-compose.yml

### "Cannot connect to database"

**Check:**
1. Docker Desktop is running
2. Container is running: `docker ps`
3. Connection string is correct
4. Password matches docker-compose.yml

### "Permission denied"

**Solution:**
- Make sure you're using the correct username: `dreamfinora`
- Check password in docker-compose.yml

---

## Production Setup

For production, you have two options:

### Option 1: Supabase (Recommended)
- Managed PostgreSQL
- Free tier: 500MB
- Automatic backups
- Easy migration from local

### Option 2: Railway/Render
- Managed PostgreSQL with backend
- Included with deployment
- Easy scaling

**We'll set up production database when we deploy (Day 46-47).**

---

## Data Backup

### Backup database:
```bash
docker exec dreamfinora_postgres pg_dump -U dreamfinora dreamfinora_dev > backup.sql
```

### Restore database:
```bash
docker exec -i dreamfinora_postgres psql -U dreamfinora dreamfinora_dev < backup.sql
```

---

**Your database is ready! See Day 4 in DEVELOPMENT_ROADMAP.md for Prisma setup.**

