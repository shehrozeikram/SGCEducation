# Server Data Cleanup Instructions

## Problem
Deleted students still appear in Fee Management because their admission records and related data weren't properly removed.

## Solution
Run this cleanup script on your server to remove all orphaned data.

---

## Steps to Run on Server

### 1. Upload the Script
```bash
# From your local machine, upload to server
scp server/scripts/cleanup_deleted_students.js user@your-server:/path/to/SGCEducation/server/scripts/
```

### 2. SSH into Server
```bash
ssh user@your-server
cd /path/to/SGCEducation/server
```

### 3. Run the Cleanup Script
```bash
node scripts/cleanup_deleted_students.js
```

### 4. Restart Your Application
```bash
# If using PM2
pm2 restart all

# If using systemd
sudo systemctl restart your-app-name

# If running manually
# Kill the process and restart
```

---

## What the Script Does

1. ✅ Finds orphaned admission records (admissions without students)
2. ✅ Deletes orphaned admissions
3. ✅ Finds inactive/deleted students
4. ✅ Deletes StudentFee records for deleted students
5. ✅ Deletes Admission records for deleted students
6. ✅ Deletes User records for deleted students
7. ✅ Deletes Student records themselves
8. ✅ Finds students whose users were deleted
9. ✅ Cleans up those orphaned students too

---

## Safety Features

- Only deletes users with `role: 'student'` (won't delete admin/teacher accounts)
- Provides detailed output showing what was deleted
- Shows summary of remaining records

---

## Expected Output

```
🔧 Starting comprehensive student cleanup...
✅ Connected to database

📋 STEP 1: Finding orphaned admissions...
   Found 15 orphaned admissions

🗑️  STEP 2: Deleting orphaned admissions...
   Deleted 15 orphaned admission records

📋 STEP 3: Finding inactive/deleted students...
   Found 10 inactive/deleted students

🗑️  STEP 4: Deleting related data for inactive students...
   Deleted 50 StudentFee records
   Deleted 10 Admission records
   Deleted 10 User records
   Deleted 10 Student records

📊 CLEANUP SUMMARY:
   Students remaining: 45
   Admissions remaining: 45
   StudentFees remaining: 200

✅ Cleanup completed successfully!
```

---

## After Running

1. Refresh the Fee Management page
2. Deleted students should no longer appear
3. Only active students with proper admission records will show
