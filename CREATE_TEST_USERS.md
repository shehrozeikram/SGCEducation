# Create Test Users (Super Admin and Admin)

## Yes! User Creation Functionality Exists

The system has a **User Management** page where you can create users with different roles, including Super Admin and Admin.

## How to Create Users

### Method 1: Through the Web Interface (Recommended)

1. **Log in as Super Admin:**
   - Email: `haris@sgceducation.com`
   - Password: `superadmin`

2. **Navigate to Users Page:**
   - Go to **Users** in the sidebar menu
   - Or visit: `https://sgcschool.ddns.net/users`

3. **Click "Add User" Button:**
   - You'll see an "Add User" or "+" button
   - Click it to open the user creation form

4. **Fill in User Details:**
   - **Name:** Full name of the user
   - **Email:** User's email address (must be unique)
   - **Password:** Set a password (minimum 6 characters)
   - **Role:** Select from dropdown:
     - `super_admin` - Full system access
     - `admin` - Institution admin
     - `teacher` - Teacher role
     - `student` - Student role
   - **Institution:** (Required for admin, teacher, student - not for super_admin)
   - **Department:** (Optional)
   - **Phone:** (Optional)

5. **Click "Save" or "Create User"**

### Method 2: Via API (For Testing)

You can also create users directly via API:

```bash
# Get your auth token first (login)
TOKEN="your-jwt-token-here"

# Create a Super Admin user
curl -X POST https://sgcschool.ddns.net/api/v1/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Super Admin",
    "email": "testsuperadmin@sgceducation.com",
    "password": "test123456",
    "role": "super_admin"
  }'

# Create an Admin user (requires institution)
curl -X POST https://sgcschool.ddns.net/api/v1/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Admin",
    "email": "testadmin@sgceducation.com",
    "password": "test123456",
    "role": "admin",
    "institution": "INSTITUTION_ID_HERE"
  }'
```

## Role Permissions

### Super Admin
- ✅ Can create users with **any role** (including other super admins)
- ✅ Can manage **all institutions**
- ✅ Full system access
- ❌ Does NOT require an institution

### Admin
- ✅ Can create users with roles: `admin`, `teacher`, `student`
- ❌ **Cannot** create `super_admin` users
- ✅ Can only manage users in **their own institution**
- ✅ Requires an institution to be assigned

## Important Notes

1. **Super Admin Creation:**
   - Only **Super Admin** users can create other Super Admin users
   - Regular admins cannot create super admins

2. **Institution Requirement:**
   - `admin`, `teacher`, and `student` roles **require** an institution
   - `super_admin` does **not** require an institution

3. **Email Uniqueness:**
   - Each email can only be used once
   - If you get "User already exists" error, use a different email

4. **Password Requirements:**
   - Minimum 6 characters
   - No special requirements (but use strong passwords in production!)

## Quick Test User Creation

### Create Test Super Admin:
```
Name: Test Super Admin
Email: testsuperadmin@sgceducation.com
Password: test123456
Role: super_admin
Institution: (leave empty)
```

### Create Test Admin:
```
Name: Test Admin
Email: testadmin@sgceducation.com
Password: test123456
Role: admin
Institution: [Select an institution from dropdown]
```

## Troubleshooting

### "You cannot create super admin users"
- **Cause:** You're logged in as a regular admin
- **Solution:** Log in as super admin first

### "Institution is required"
- **Cause:** You selected `admin`, `teacher`, or `student` role but didn't select an institution
- **Solution:** Select an institution from the dropdown (or create one first)

### "User with this email already exists"
- **Cause:** Email is already in use
- **Solution:** Use a different email address

## Access the User Management Page

**URL:** `https://sgcschool.ddns.net/users`

Or navigate through the sidebar menu after logging in.

---

**Note:** Make sure you've created at least one institution before creating admin users, as they require an institution assignment.
