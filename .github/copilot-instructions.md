# Wine Club Next.js - Complete Guide

## 🎯 Project Overview
**FULL REWRITE** from HTML/Express to Next.js 14 + TypeScript + Tailwind CSS

## 📊 Migration Status

### ✅ Phase 1: Foundation (DONE)
- [x] Next.js project structure
- [x] Configuration files (package.json, tsconfig, tailwind, next.config)
- [x] App layout with Toaster
- [x] Environment template

### ✅ Phase 2: Core Setup (DONE)
- [x] **STEP 1:** Run `npm install` ✅
- [x] **STEP 2:** Create `.env` from `.env.example` ✅
- [x] **STEP 3:** Create TypeScript types (`types/index.ts`) ✅
- [x] **STEP 4:** Migrate database layer (`lib/db/`) ✅
- [x] **STEP 5:** Create auth utilities (`lib/auth.ts`) ✅

### ✅ Phase 3: API & Components (DONE)
- [x] Build reusable components (`components/`)
- [x] Create 20+ API routes (`app/api/`)
- [x] Build 7 pages with proper routing

## 🗄️ Database Credentials

**MongoDB Atlas:**
```
URI: (YOUR URL)
Database: club_wine
Collections: Users, Events, Points, Subscriptions, Payments, EventRegistrations, PointsHistory, AdminLogs, Webhooks
```

**Test Accounts:**
- Admin: `admin@clubwine.com` / `Admin@2026`
- Member: `member@clubwine.com` / `Member@2026` (6.5M points)
- Guest: `guest@clubwine.com` / `Guest@2026` (0 points)

**KEEP THIS DATABASE** - Don't migrate data, just connect the new app to existing MongoDB.

## 🚀 IMMEDIATE NEXT STEPS

### Step 1: Install Dependencies
```bash
npm install
```

Expected packages:
- next@14.2.23, react@18.3.1, react-dom@18.3.1
- mongoose@8.0.0, bcryptjs@2.4.3, jsonwebtoken@9.0.2
- zustand@4.5.0, react-hot-toast@2.4.1, axios@1.6.0
- TypeScript dev dependencies

### Step 2: Environment Setup
Copy `.env.example` to `.env` and update with actual values:
```env
MONGODB_URI=(Your_URL)
JWT_SECRET=<your-secret-key>
XENDIT_SECRET_KEY=<your-xendit-key>
XENDIT_WEBHOOK_TOKEN=<your-webhook-token>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 3: Create TypeScript Types
**File:** `types/index.ts`

```typescript
export interface User {
  _id: string;
  email: string;
  role: 'GUEST' | 'ACTIVE_MEMBER' | 'ADMIN' | 'SUPER_ADMIN';
  status: 'GUEST' | 'ACTIVE_MEMBER' | 'CANCELLED';
  created_at: Date;
}

export interface Event {
  _id: string;
  id: string; // Important: API returns both _id and id
  title: string;
  description?: string;
  location: string;
  event_date: Date;
  points_cost: number;
  max_attendees: number;
  current_attendees: number;
  image_url?: string;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  isRegistered?: boolean; // Added by API for current user
}

export interface Points {
  user_id: string;
  balance: number;
  last_updated: Date;
}

export interface Subscription {
  user_id: string;
  xendit_customer_id: string;
  xendit_subscription_id: string;
  status: 'ACTIVE' | 'INACTIVE' | 'CANCELLED';
  amount: number;
  start_date: Date;
  next_billing_date?: Date;
}
```

### Step 4: Database Layer

Create `lib/db/mongodb.ts`:
- Copy MongoDB connection logic
- Convert to TypeScript with proper types
- Export `connectDB()` function
- Keep all CRUD operations

Create `lib/db/models.ts`:
- Copy all 9 Mongoose schemas
- Add TypeScript interfaces
- Export all models

### Step 5: Auth Utilities
**Reference:** `club-wine-2/auth.js`

Create `lib/auth.ts`:
- Copy JWT signing/verification functions
- Copy password hashing functions
- Add TypeScript types
- Export middleware for API routes

## 📁 File Migration Map

| Old File | New File | Description |
|----------|----------|-------------|
| `mongodb.js` | `lib/db/mongodb.ts` | Database connection & operations |
| `models.js` | `lib/db/models.ts` | Mongoose schemas |
| `auth.js` | `lib/auth.ts` | JWT & bcrypt utilities |
| `public/index.html` | `app/page.tsx` | Landing page |
| `public/login.html` | `app/login/page.tsx` | Login page |
| `public/profile.html` | `app/profile/page.tsx` | Profile with subscription |
| `public/events.html` | `app/events/page.tsx` | Event carousel |
| `public/admin.html` | `app/admin/page.tsx` | Admin dashboard |

## 🎨 Design System (Already Configured)

**Tailwind colors in `tailwind.config.ts`:**
- `primary-500`: #4F6D7A (wine club brand)
- `accent-500`: #7FA99B (success/highlights)
- `neutral-50 to neutral-900`: Grays
- `error-500`: #B85C5C (errors)

**Utilities in `app/globals.css`:**
- `.gradient-primary` - Button gradient
- `.gradient-accent` - Image placeholder gradient

## 🔑 Critical Features to Preserve

### Event Carousel (events.html → app/events/page.tsx)
- **3 cards visible:** left (side), center (active), right (side)
- **Smooth transitions:** `transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]`
- **Side cards:** `scale-85 opacity-50 blur-sm`
- **Center card:** `scale-100 opacity-100`
- **Max height:** 640px center, 520px sides (scrollable content)
- **Keyboard nav:** Arrow keys change slides
- **Image fallback:** Gradient placeholder with event title

### Subscription Modal (profile.html → app/profile/page.tsx)
- **Guest sees:** "Subscribe Now" button
- **Member sees:** "Cancel Subscription" button
- **Modal shows:** Price (IDR 1.5M/month), benefits, confirm/cancel
- **On confirm:** POST to `/api/subscription/create`, redirect to Xendit

### Admin Dashboard (admin.html → app/admin/page.tsx)
- **Tabs:** Events, Users, Payments, Webhooks
- **Icons:** Material Symbols Outlined (Google Fonts)
- **Event CRUD:** Modal form for create/edit
- **Points adjustment:** Form with reason field

## 🛠️ API Routes to Create

**Auth (`app/api/auth/`):**
- `POST /api/auth/login` - JWT authentication
- `POST /api/auth/register` - Create account

**Profile (`app/api/profile/`):**
- `GET /api/profile` - User info + points + subscription

**Events (`app/api/events/`):**
- `GET /api/events` - All events (members only)
- `POST /api/events/redeem` - Redeem with points

**Subscriptions (`app/api/subscription/`):**
- `POST /api/subscription/create` - Xendit subscription
- `POST /api/subscription/cancel` - Cancel subscription
- `POST /api/webhook/subscription` - Xendit webhook

**Admin (`app/api/admin/`):**
- Events: GET, POST, PUT, DELETE
- Users: GET, points adjustment
- Payments: GET history
- Webhooks: GET logs

## 💡 Important Rules

1. **Server vs Client Components:**
   - Use Server Components by default
   - Add `'use client'` only for: forms, `useState`, `useEffect`, event handlers

2. **API Routes:**
   - File: `app/api/[route]/route.ts`
   - Export: `GET`, `POST`, `PUT`, `DELETE` functions
   - Return: `NextResponse.json()`

3. **Middleware:**
   - Create `middleware.ts` for protected routes
   - Check JWT token
   - Verify user roles

4. **MongoDB:**
   - Call `connectDB()` in every API route
   - Don't modify database schema
   - Use existing collections

5. **JWT:**
   - Keep 7-day expiry
   - Store in localStorage (client)
   - Pass in Authorization header

## 🚦 Development Workflow

```bash
# 1. Install
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with real values

# 3. Run dev server
npm run dev

# 4. Open browser
# http://localhost:3000

# 5. Test as you build
# - Create one API route → test with Postman/Thunder Client
# - Create one page → verify in browser
# - Build incrementally, don't write everything at once
```

## 🎯 Success Checklist

- [ ] Dependencies installed (npm install works)
- [ ] MongoDB connection successful
- [ ] Types defined for all entities
- [ ] Login API works (returns JWT)
- [ ] Profile page shows user data
- [ ] Event carousel renders and animates
- [ ] Guest can subscribe
- [ ] Member can redeem events
- [ ] Admin can create events
- [ ] All 7 pages load without errors
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] No console errors in browser

---

**START WITH:** `npm install` then create `types/index.ts` 🚀

## When Adding Features
1. **New page**: Create `app/[route]/page.tsx` (Server Component by default)
2. **API endpoint**: Add `app/api/[route]/route.ts` with `GET`/`POST` exports
3. **Styling**: Use custom palette (`primary-*`, `accent-*`) + `dark:` variants
4. **Images**: Always use `next/image` with explicit `width`/`height`
5. **Fonts**: Apply Geist via className variables (already set in layout)
