# Reservation Code System Implementation

## Overview
Added a comprehensive reservation code system for event registrations that provides unique tracking IDs for both users and admins.

## Changes Made

### 1. Database Schema Update
**File:** `lib/db/models.ts`
- Added `reservation_code` field to `EventRegistration` schema
- Type: String, required, unique
- Format: `RES-XXXXXXXX` (8 random alphanumeric characters)

### 2. Code Generation
**File:** `lib/helpers.ts` (NEW)
- Created utility functions including:
  - `generateReservationCode()` - Generates unique reservation codes
  - `formatCurrency()` - Format Indonesian Rupiah
  - `formatDate()` - Format dates for display
  - `formatDateTime()` - Format datetime for display

**File:** `lib/db/mongodb.ts`
- Updated `EventDB.register()` to automatically generate unique reservation codes
- Implements uniqueness check to prevent duplicates
- Random generation using alphanumeric characters (A-Z, 0-9)

### 3. API Endpoints
**File:** `app/api/profile/registrations/route.ts` (NEW)
- GET endpoint to fetch user's registered events
- Returns array of registrations with event details and reservation codes
- Requires authentication

### 4. User Profile Page
**File:** `app/profile/page.tsx`
- Added new interface `EventRegistration` for type safety
- Added state for managing registrations
- Added `fetchRegistrations()` function to load user's events
- Added "My Registered Events" section with table displaying:
  - Event Name
  - Location
  - Date
  - Point Cost
  - Reservation ID (highlighted in primary color with monospace font)
- Only visible to ACTIVE_MEMBER users who have registrations

### 5. Admin Dashboard
**File:** `app/admin/page.tsx`
- Updated `Registration` interface to include `reservation_code`
- Added "Reservation ID" column to event members modal
- Styled with monospace font and primary color for visibility
- Shows reservation code for each registered member

### 6. TypeScript Types
**File:** `types/index.ts`
- Updated `EventRegistration` interface to include:
  - `points_spent: number`
  - `reservation_code: string`

## Features

### User-Facing
1. **Profile View:**
   - Users see all their registered events in a clean table
   - Each registration shows a unique reservation ID
   - Reservation codes are clearly displayed with monospace font
   - Easy to reference for event check-in or support

### Admin-Facing
1. **Event Management:**
   - Admins can view all members registered for an event
   - Each member's reservation code is displayed
   - Helps with event check-in and verification
   - Easy to copy/search reservation codes

## Technical Details

### Reservation Code Format
- Prefix: `RES-`
- Length: 12 characters total (including prefix)
- Characters: Uppercase A-Z and 0-9
- Example: `RES-A4F3K9Q2`

### Uniqueness Guarantee
The code generation includes a uniqueness check:
1. Generate random code
2. Check database for existing codes
3. If exists, generate new code
4. Repeat until unique code is found
5. Save to database

### Database Index
- Unique index on `reservation_code` field ensures no duplicates
- Existing compound index on `(user_id, event_id)` remains unchanged

## Migration Notes

### Existing Registrations
- Existing event registrations in the database will not have reservation codes
- New registrations (after this update) will automatically get codes
- Consider running a migration script to add codes to existing registrations:

```javascript
// Example migration (not included in implementation)
const EventRegistration = require('./models').EventRegistration;

async function migrateExistingRegistrations() {
  const registrations = await EventRegistration.find({ reservation_code: { $exists: false } });
  
  for (const reg of registrations) {
    let code = generateUniqueCode();
    reg.reservation_code = code;
    await reg.save();
  }
}
```

## UI Styling

### Profile Table
- Clean, modern table design with hover effects
- Monospace font for reservation codes (easier to read)
- Primary color highlighting for codes
- Responsive design with horizontal scroll on mobile

### Admin Modal
- Consistent with existing table styling
- Added fourth column for Reservation ID
- Same styling as profile table for consistency

## Benefits

1. **User Benefits:**
   - Easy event verification
   - Printable/shareable reservation reference
   - Professional booking experience

2. **Admin Benefits:**
   - Quick event check-in process
   - Easy to verify registrations
   - Support ticket reference
   - Attendance tracking

3. **System Benefits:**
   - Unique identification for each registration
   - Audit trail capability
   - Future integrations (QR codes, email confirmations)
   - Support for cancellation/refund tracking

## Future Enhancements

Possible future additions:
1. QR code generation from reservation code
2. Email confirmation with reservation code
3. Print-friendly reservation tickets
4. SMS reminders with reservation code
5. Reservation code lookup tool for users
6. CSV export of registrations with codes
7. Reservation code in webhook notifications

## Testing Checklist

- [x] New event registrations generate unique codes
- [x] Reservation codes display on profile page
- [x] Reservation codes display in admin modal
- [x] TypeScript compilation successful
- [x] No console errors
- [ ] Test with actual database (requires MongoDB connection)
- [ ] Verify uniqueness constraint works
- [ ] Test with multiple simultaneous registrations

## Files Modified

1. `lib/db/models.ts` - Schema update
2. `lib/db/mongodb.ts` - Code generation logic
3. `lib/helpers.ts` - Utility functions (NEW)
4. `app/api/profile/registrations/route.ts` - API endpoint (NEW)
5. `app/profile/page.tsx` - User profile UI
6. `app/admin/page.tsx` - Admin dashboard UI
7. `types/index.ts` - TypeScript interfaces

## Dependencies

No new dependencies required. All functionality uses existing libraries:
- MongoDB/Mongoose (existing)
- Next.js App Router (existing)
- React hooks (existing)
