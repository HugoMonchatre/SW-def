# SW-def Project Documentation

## Overview
Full-stack authentication platform with guild management system for a Star Wars themed application.

## Tech Stack

### Frontend
- **Framework:** React 18 with Vite
- **State Management:** Zustand
- **Styling:** CSS Modules with CSS variables for theming
- **HTTP Client:** Axios

### Backend
- **Runtime:** Node.js with Express
- **Database:** MongoDB Atlas with Mongoose ODM
- **Authentication:**
  - JWT for session management
  - Passport.js for OAuth (Discord, Google)
  - Email/password with bcrypt

## Project Structure

```
SW-def/
├── backend/
│   ├── config/
│   │   ├── env.js          # Environment config
│   │   └── passport.js     # OAuth strategies
│   ├── middleware/
│   │   └── auth.js         # JWT authentication middleware
│   ├── models/
│   │   ├── User.js         # User model
│   │   └── Guild.js        # Guild model
│   ├── routes/
│   │   ├── auth.js         # Auth routes (login, register, OAuth)
│   │   ├── users.js        # User management routes
│   │   └── guilds.js       # Guild management routes
│   ├── scripts/
│   │   └── initAdmin.js    # Create/update admin account
│   └── server.js           # Express server entry point
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Modal.jsx   # Modal, Toast, ConfirmDialog
│   │   │   └── Navbar.jsx  # Navigation bar
│   │   ├── pages/
│   │   │   ├── HomePage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   └── GuildPage.jsx
│   │   ├── store/
│   │   │   ├── authStore.js   # Auth state (Zustand)
│   │   │   └── themeStore.js  # Theme state (dark/light)
│   │   ├── App.jsx
│   │   └── index.css       # Global styles & CSS variables
│   └── vite.config.js
└── CLAUDE.md
```

## Data Models

### User
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  avatar: String (URL),
  provider: 'email' | 'discord' | 'google',
  providerId: String,
  role: 'user' | 'guild_leader' | 'admin',
  createdAt: Date
}
```

### Guild
```javascript
{
  name: String (unique),
  description: String,
  logo: String (URL),
  leader: ObjectId (ref: User),
  subLeaders: [ObjectId] (ref: User, max: 4),
  members: [ObjectId] (ref: User),
  maxMembers: Number (default: 30),
  joinRequests: [{
    user: ObjectId,
    message: String,
    createdAt: Date
  }],
  createdAt: Date
}
```

## Roles & Permissions

| Role | Permissions |
|------|-------------|
| `user` | View guilds, request to join |
| `guild_leader` | Create guild, manage members, promote sub-leaders |
| `admin` | All permissions, manage all guilds/users |

## Key Features

### Guild System
- Leaders can create one guild
- Max 4 sub-leaders per guild
- Max 30 members per guild
- Join request system with accept/reject
- Hierarchical member display (leader → sub-leaders → members)
- Collapsible guild card with animation

### UI Components
- **Modal:** Generic modal with backdrop
- **Toast:** Success/error notifications
- **ConfirmDialog:** Confirmation prompts with variants (danger, info)
- **Tabs:** Switch between "Ma Guilde" and "Toutes les guildes"

## CSS Variables (Theme)

```css
--primary: #6366f1;
--secondary: #8b5cf6;
--bg-primary: #ffffff | #1a1a2e;
--bg-secondary: #f8fafc | #16162a;
--text-primary: #1e293b | #f1f5f9;
--text-secondary: #64748b | #94a3b8;
--border-color: #e2e8f0 | #2d2d44;
```

## Common Commands

```bash
# Start backend (from backend/)
npm run dev

# Start frontend (from frontend/)
npm run dev

# Create/update admin account
cd backend; node scripts/initAdmin.js
```

## Environment Variables

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FRONTEND_URL=http://localhost:5173
SUPER_ADMIN_EMAIL=admin@swdef.com
SUPER_ADMIN_PASSWORD=admin123
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
```

## Admin Account
- **Email:** admin@swdef.com
- **Password:** admin123
- Run `node scripts/initAdmin.js` to create/reset

## Troubleshooting

### MongoDB Connection Timeout
- Check MongoDB Atlas cluster is not paused
- Verify IP whitelist (0.0.0.0/0 for dev)
- Add database name to URI: `mongodb+srv://...mongodb.net/swdef?...`

### OAuth Errors (TokenError)
- Verify Discord/Google credentials in .env
- Check callback URLs in Discord/Google developer console
- Ensure `http://localhost:5000/api/auth/discord/callback` is whitelisted
