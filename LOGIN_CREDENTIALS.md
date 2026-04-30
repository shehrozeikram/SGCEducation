# Login Credentials and User Setup

## Super Admin User

The system **automatically creates a Super Admin user** when the server starts for the first time.

### Default Super Admin Credentials

- **Email:** `haris@sgceducation.com`
- **Password:** `superadmin`
- **Role:** `super_admin`

### How It Works

The super admin is automatically created by `server/utils/createSuperAdmin.js` when:
1. The server starts
2. MongoDB connection is established
3. No super admin exists in the database

This happens automatically in `server/server.js`:
```javascript
connectDB().then(() => {
  createSuperAdmin(); // Creates super admin if doesn't exist
});
```

## How to Log In

### On Production Server (https://sgcschool.ddns.net)

1. **Open your browser** and go to: `https://sgcschool.ddns.net`
2. **You should see the login page**
3. **Enter credentials:**
   - Email: `haris@sgceducation.com`
   - Password: `superadmin`
4. **Click Login**

### On Local Development (http://localhost:3000)

1. **Start the frontend:** `cd client && npm start`
2. **Open browser:** `http://localhost:3000`
3. **Enter credentials:**
   - Email: `haris@sgceducation.com`
   - Password: `superadmin`

## Verify Super Admin Exists

### Check Server Logs

When the server starts, you should see one of these messages:

**If super admin already exists:**
```
Super Admin already exists
```

**If super admin was just created:**
```
Super Admin created successfully!
Email: haris@sgceducation.com
Password: superadmin
```

### Check Database Directly

You can verify the super admin exists by connecting to MongoDB:

```bash
# Connect to MongoDB
mongo
# or
mongosh

# Switch to database
use sgceducation

# Find super admin
db.users.findOne({ role: "super_admin" })
```

## Reset Super Admin Password

If you need to reset the super admin password, use the reset script:

### On Server

```bash
cd /var/www/SGCEducation/server
node scripts/resetSuperAdmin.js
```

This will:
1. Delete the existing super admin
2. Create a new super admin with the default credentials

### Output

```
Connected to MongoDB
Deleted old Super Admin
✅ New Super Admin created successfully!
Email: haris@sgceducation.com
Password: superadmin
```

## Create Additional Admin Users

After logging in as super admin, you can create additional admin users:

1. **Log in** as super admin
2. **Navigate to:** Users Management
3. **Click:** Add New User
4. **Fill in details:**
   - Name
   - Email
   - Password
   - Role: `admin`
   - Institution: (select an institution)
5. **Save**

## Troubleshooting

### Can't Log In?

1. **Check if server is running:**
   ```bash
   pm2 status
   ```

2. **Check server logs:**
   ```bash
   pm2 logs sgc-education-api
   ```

3. **Verify MongoDB connection:**
   ```bash
   # Check if MongoDB is running
   sudo systemctl status mongod
   ```

4. **Check if super admin exists:**
   ```bash
   cd /var/www/SGCEducation/server
   node scripts/resetSuperAdmin.js
   ```

### Super Admin Not Created?

If the super admin wasn't created automatically:

1. **Check MongoDB connection** in server logs
2. **Manually run the reset script:**
   ```bash
   cd /var/www/SGCEducation/server
   node scripts/resetSuperAdmin.js
   ```

3. **Check for errors** in the console output

### Forgot Password?

Use the reset script to recreate the super admin:

```bash
cd /var/www/SGCEducation/server
node scripts/resetSuperAdmin.js
```

This will reset the password back to `superadmin`.

## Security Recommendations

⚠️ **IMPORTANT:** After first login, you should:

1. **Change the super admin password** immediately
2. **Create additional admin users** for your team
3. **Consider changing the default email** if needed

### Change Password

1. Log in as super admin
2. Go to **Profile** or **Settings**
3. Change password
4. Save

## User Roles

- **super_admin:** Full system access, can manage all institutions
- **admin:** Can manage their institution only
- **teacher:** Limited access, can manage classes/sections assigned to them
- **student:** Read-only access to their own data

## First Steps After Login

1. ✅ **Change super admin password**
2. ✅ **Create your first institution** (if you're a super admin)
3. ✅ **Create admin users** for each institution
4. ✅ **Set up organizations** (if needed)
5. ✅ **Create departments, classes, and sections**
6. ✅ **Start managing admissions**

---

**Note:** The super admin user is created automatically on first server start. If you don't see it, check the server logs for any MongoDB connection errors.
