# Admin Panel Documentation

## Overview

The admin panel provides a comprehensive interface for managing all aspects of the VPN application. Administrators can manage servers, users, subscription plans, support tickets, and view analytics.

## Features

### 1. Dashboard Statistics
- Total users count
- Active subscriptions count
- Monthly revenue
- Open support tickets
- Server usage statistics

### 2. Server Management
**Capabilities:**
- View all servers with their status, country, and configuration
- Add new servers with custom settings:
  - Server name
  - Country and flag (emoji)
  - Protocol (VLESS, VMESS, Trojan)
  - Ping/latency
  - Admin message (displayed to users)
- Edit existing server configurations
- Delete servers
- Change server status (Online, Maintenance, Crowded)

**Admin Messages:**
- Each server can have a custom message displayed to users
- Useful for announcements, warnings, or special features
- Examples: "High-speed VIP server", "Maintenance until 18:00"

### 3. User Management
**Capabilities:**
- Search users by name or Telegram ID
- View user details:
  - Balance (stars)
  - Subscription status
  - Registration date
- Edit user properties:
  - Balance modification
  - Account activation/deactivation
  - Grant/revoke admin privileges
- Ban/unban users

### 4. Subscription Plans Management
**Capabilities:**
- View all available plans
- Create new subscription plans:
  - Plan name
  - Duration (in months)
  - Price (in Telegram stars)
  - Discount percentage
- Edit existing plans
- Delete plans
- Activate/deactivate plans

### 5. Support Ticket Management
**Capabilities:**
- View all support tickets
- Filter by status (Open, Answered, Closed)
- Reply to user tickets
- Change ticket status
- View ticket history and conversation

## Access Control

### Admin Role
- Only users with `is_admin = true` in the database can access the admin panel
- Admin status is checked on both frontend and backend
- All admin API endpoints are protected with `RequireAdmin` middleware

### Setting Admin Privileges

**Database:**
```sql
UPDATE users SET is_admin = true WHERE telegram_id = 'YOUR_TELEGRAM_ID';
```

**API:**
```bash
PUT /api/v1/admin/users/:user_id
{
  "is_admin": true
}
```

## Frontend Routes

- `/admin` - Main admin panel (only visible to admins)
- Accessible from main page via "Admin Panel" button (shown only to admins)

## Backend API Endpoints

All endpoints require authentication and admin privileges.

### Statistics
```
GET /api/v1/admin/stats
```
Returns dashboard statistics.

### Server Management
```
GET    /api/v1/admin/servers          # List all servers
POST   /api/v1/admin/servers          # Create new server
PUT    /api/v1/admin/servers/:id      # Update server
DELETE /api/v1/admin/servers/:id      # Delete server
```

### User Management
```
GET    /api/v1/admin/users            # List all users (with pagination)
PUT    /api/v1/admin/users/:id        # Update user (balance, status, admin role)
```

### Plan Management
```
GET    /api/v1/admin/plans            # List all plans
POST   /api/v1/admin/plans            # Create new plan
PUT    /api/v1/admin/plans/:id        # Update plan
DELETE /api/v1/admin/plans/:id        # Delete plan
```

### Ticket Management
```
GET    /api/v1/admin/tickets          # List all tickets (filter by status)
POST   /api/v1/admin/tickets/:id/reply # Reply to ticket
```

## Security

1. **Authentication**: All admin endpoints require valid Telegram WebApp authentication
2. **Authorization**: Admin middleware checks `is_admin` flag in database
3. **Audit**: All admin actions are logged with zerolog
4. **Access Denied**: Non-admin users receive 403 Forbidden response

## UI Components

### Tab Navigation
- Stats - Dashboard with key metrics
- Servers - Server management interface
- Users - User management and search
- Plans - Subscription plan configuration
- Tickets - Support ticket handling

### Interactive Features
- Real-time search and filtering
- Inline editing forms
- Confirmation dialogs for deletions
- Toast notifications for actions
- Responsive mobile-first design

## Best Practices

1. **Server Messages**: Keep admin messages concise and informative
2. **User Balance**: Always log balance modifications
3. **Plan Pricing**: Consider market rates when setting prices
4. **Ticket Replies**: Be professional and helpful
5. **Admin Access**: Grant admin privileges sparingly

## Database Schema Changes

New field added to `users` table:
```sql
is_admin BOOLEAN DEFAULT false
```

New field added to `servers` table:
```sql
admin_message TEXT NULL
```

## Testing

1. Set a user as admin in the database
2. Login with that Telegram account
3. Verify "Admin Panel" button appears on main page
4. Test all CRUD operations in each section
5. Verify non-admin users cannot access `/admin` route

## Troubleshooting

**Issue**: Admin panel not showing
- Check `is_admin` flag in database
- Verify frontend receives `isAdmin` from API
- Check browser console for errors

**Issue**: 403 Forbidden on admin endpoints
- Verify Telegram authentication is working
- Check user has `is_admin = true`
- Review server logs for middleware errors

**Issue**: Changes not saving
- Check API request/response in Network tab
- Verify database connection
- Review backend logs for errors
