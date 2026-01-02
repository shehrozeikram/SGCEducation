# Student Status Update Guide

## Status Rules for Student Operations

### 1. **PROMOTE** (Same Institution, Next Class)
- **Student Status**: `'active'` (remains active)
- **Admission Status**: `'enrolled'` (remains enrolled)
- **Updates**:
  - Student: `section` (string), `academicYear`
  - Admission: `class`, `section` (ObjectId), `institution` (same)
- **Where Status is Displayed**:
  - Student Promotion page (shows "enrolled" status)
  - Admissions page - "All Admissions" table (shows "enrolled" status)
  - Admissions page - "Search Student" table (shows "enrolled" status)
  - Student list pages (if any)

### 2. **TRANSFER** (Different Institution)
- **Student Status**: `'transferred'` (changed to transferred)
- **Admission Status**: `'enrolled'` (remains enrolled at new institution)
- **Updates**:
  - Student: `institution`, `section` (string), `academicYear`, `status: 'transferred'`
  - Admission: `institution`, `class`, `section` (ObjectId)
- **Where Status is Displayed**:
  - Student Promotion page (shows "transferred" status)
  - Admissions page - "All Admissions" table (shows "enrolled" status)
  - Admissions page - "Search Student" table (shows "transferred" status if querying Student model)
  - Student list pages (shows "transferred" status)

### 3. **PASS OUT** (Last Class Completion)
- **Student Status**: `'graduated'` (changed to graduated)
- **Admission Status**: `'enrolled'` (remains enrolled)
- **Updates**:
  - Student: `status: 'graduated'`
  - Admission: No changes (keeps current class/section)
- **Where Status is Displayed**:
  - Student Promotion page (shows "graduated" status)
  - Admissions page - "All Admissions" table (shows "enrolled" status)
  - Admissions page - "Search Student" table (shows "graduated" status if querying Student model)
  - Student list pages (shows "graduated" status)

## Database Tables

### 1. **Student Table** (`students` collection)
- **Status Field**: `status` (enum: 'active', 'inactive', 'transferred', 'graduated', 'expelled', 'on_leave')
- **Query Examples**:
  ```javascript
  // Find all active students
  Student.find({ status: 'active' })
  
  // Find all transferred students
  Student.find({ status: 'transferred' })
  
  // Find all graduated/passout students
  Student.find({ status: 'graduated' })
  ```

### 2. **Admission Table** (`admissions` collection)
- **Status Field**: `status` (enum: 'pending', 'under_review', 'approved', 'rejected', 'enrolled', 'cancelled')
- **Note**: Admission status typically stays 'enrolled' for all operations
- **Query Examples**:
  ```javascript
  // Find all enrolled admissions
  Admission.find({ status: 'enrolled' })
  ```

### 3. **StudentPromotion Table** (`studentpromotions` collection) - NEW
- **Tracks History**: All promotion/transfer/passout operations
- **Query Examples**:
  ```javascript
  // Find all promotions
  StudentPromotion.find({ operationType: 'promote' })
  
  // Find all transfers
  StudentPromotion.find({ operationType: 'transfer' })
  
  // Find all passouts
  StudentPromotion.find({ operationType: 'passout' })
  
  // Find operations for a specific student
  StudentPromotion.find({ student: studentId })
    .sort({ operationDate: -1 })
  ```

## Pages Where Status is Displayed

### 1. **Student Promotion Page** (`/student-promotion`)
- Shows student status from Admission model
- Status should update immediately after operation
- Displays: "enrolled", "transferred", or "graduated" based on Student model status

### 2. **Admissions Page - All Admissions** (`/admissions`)
- Shows admission status (typically "enrolled")
- Table column: "Status"
- Shows Chip with status color

### 3. **Admissions Page - Search Student** (`/admissions/students/search`)
- Shows student status from Student model
- Table column: "Status"
- Should show: "active", "transferred", or "graduated"

### 4. **Admissions Page - Admission Register** (`/admissions/register`)
- Shows admission status
- Table column: "Status"

## API Endpoint

**POST** `/api/v1/student-promotions`

**Request Body**:
```json
{
  "promotionType": "promote" | "transfer" | "passout",
  "studentIds": ["admissionId1", "admissionId2"],
  "from": {
    "institution": "institutionId",
    "class": "classId",
    "section": "sectionId",
    "group": "groupId",
    "academicYear": "2025-2026"
  },
  "to": {
    "institution": "institutionId",
    "class": "classId",
    "section": "sectionId",
    "group": "groupId",
    "academicYear": "2025-2026"
  },
  "remarks": "Optional remarks"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Successfully processed X out of Y student(s)",
  "data": {
    "processed": 2,
    "total": 2,
    "results": [...],
    "errors": []
  }
}
```

## Important Notes

1. **Student Model** stores `section` as a **String** (uppercase), not ObjectId
2. **Admission Model** stores `section` as an **ObjectId** reference
3. When promoting/transferring, both Student and Admission records are updated
4. The StudentPromotion table maintains a complete history of all operations
5. Status updates are immediate - no need to refresh manually (frontend auto-refreshes)
















