## feat: expand admin settings, subscription plan APIs, and auth banner management

### Summary
This PR advances the Next.js migration by adding admin settings capabilities, subscription plan management endpoints, registration/profile API improvements, and UI/auth banner plumbing.

---

### What changed
- **Admin settings pages** for:
  - Auth banners
  - Subscription settings
  - Subscription plans
- **Admin APIs**:
  - Diagnostics and DB testing
  - Event image upload and event registrations
  - Subscription plan CRUD and migration routes
  - Admin UI auth-banner config and upload
- **User-facing/support APIs**:
  - Subscription plan retrieval
  - Profile registrations
  - Subscription create/webhook adjustments
  - Public UI auth-banner route
- **Core app pages and styling**:
  - Admin, events, login, profile, register, layout, global styles
- **Server/domain utilities**:
  - Auth banners helpers/store
  - Subscription plan helpers/store
  - DB models/connection updates
  - Shared types updates
- **Scripts and seeded assets**:
  - Seed/test scripts
  - Auth banner and event images
  - Reservation system documentation

---

### Why
- Complete key migration gaps from the legacy app  
- Enable admin self-service for subscription and banner configuration  
- Support richer event/subscription flows needed by profile/events/admin surfaces  

---

### Validation
- Branch builds on existing migration structure  
- API/page wiring is in place for admin + member flows  
- Ready for reviewer testing in dev environment (`npm run dev`)  

---

### Notes
- Includes both code and static asset additions  
- Focused on migration completeness and operational admin tooling  
