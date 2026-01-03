-# Windows PostgreSQL PATH Fix

## Problem
`psql` command not recognized after installing PostgreSQL.

## Quick Solutions

### Solution 1: Use Full Path
```bash
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres
```
(Replace `15` with your version number)

### Solution 2: Add to PATH (Recommended)

1. **Find PostgreSQL location:**
   - Open File Explorer
   - Go to: `C:\Program Files\PostgreSQL\`
   - Note the folder number (14, 15, 16, etc.)
   - Open that folder → `bin` folder
   - Copy this path: `C:\Program Files\PostgreSQL\[VERSION]\bin`

2. **Add to PATH:**
   - Press `Win + X` → System → Advanced system settings
   - Click "Environment Variables"
   - Under "User variables", select "Path" → "Edit"
   - Click "New" → Paste the bin path → OK
   - **Close and reopen terminal**

3. **Test:**
   ```bash
   psql --version
   ```

### Solution 3: Use pgAdmin (Easiest - No Command Line)

1. Open **pgAdmin** from Start menu
2. Enter your PostgreSQL password when prompted
3. Right-click "Databases" → "Create" → "Database"
4. Name: `dream_finora` → Save
5. Repeat for: `dream_finora_test`

Then continue with setup steps using pgAdmin or after fixing PATH.


