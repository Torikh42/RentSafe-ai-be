# Role Management Design Spec

## Purpose

To allow users to select their role (Tenant or Landlord) in RentSafe AI. This determines which features and dashboard they have access to.

## Architecture & Data Flow

### Backend (Hono + Drizzle)

1. **Schema Update:** Add `role` column to the `users` table (`varchar`, enum: `'tenant', 'landlord', 'admin'`). Default is `null`.
2. **Better Auth Config:** Configure Better Auth plugins or schema mapping to include the `role` field in the session object.
3. **API Endpoint:** Create `PATCH /api/users/me` (or similar) to allow users to set their `role`. This endpoint must require authentication and ensure `role` is either `tenant` or `landlord`.

### Frontend (Next.js)

1. **Route Protection:** Update `DashboardLayout` to check if `session.user.role` is null.
2. **Role Selection Page:** If `role` is null, redirect the user to `/dashboard/role-selection`.
3. **UI/UX (Frontend-Design):** The `/dashboard/role-selection` page will feature a glassmorphic split-screen or side-by-side card choice:
   - "Find Property" (Tenant path) - Focus on security, AI chat, escrow.
   - "Rent Property" (Landlord path) - Focus on property management, AI inspection, guaranteed payments.
4. **Dashboard Divergence:** Once a role is selected, the `/dashboard` route renders different components/links based on the role (e.g., Tenant sees "My Bookings", Landlord sees "My Properties").

## Error Handling

- If `PATCH` to set role fails, display a generic error message (e.g., "Failed to set role. Please try again.").
- Backend validation ensures only valid strings are accepted as roles.

## Testing

- Ensure users with no role are forced to `/dashboard/role-selection`.
- Ensure users who have selected a role cannot change it via the UI (for now, role changes require admin intervention or separate process).
- Ensure the selected role correctly toggles the dashboard view.
