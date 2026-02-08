# SW-def Project Documentation

## Overview
Full-stack guild war management platform for Summoners War. Features guild management, defense/offense building, tower assignment, monster inventory, and guild war map visualization.

## Tech Stack

### Frontend
- **Framework:** React 18 with Vite
- **State Management:** Zustand
- **Styling:** CSS Modules with CSS variables for theming (dark/light)
- **HTTP Client:** Axios (centralized in `services/api.js` with interceptor)

### Backend
- **Runtime:** Node.js with Express
- **Database:** SQLite (dev) / PostgreSQL (prod, OVH) via Sequelize ORM
- **Authentication:**
  - JWT for session management
  - Passport.js for OAuth (Discord, Google)
  - Email/password with bcrypt

## Project Structure

```
SW-def/
├── backend/
│   ├── config/
│   │   ├── database.js     # Sequelize config (SQLite dev / PostgreSQL prod)
│   │   ├── env.js           # Environment config
│   │   └── passport.js      # OAuth strategies (Discord, Google)
│   ├── middleware/
│   │   └── auth.js          # JWT authentication & parseId helper
│   ├── models/
│   │   ├── index.js         # Associations & junction tables (GuildMember, GuildSubLeader, GuildJoinRequest, OffenseDefense, TowerDefense)
│   │   ├── User.js
│   │   ├── Guild.js
│   │   ├── Defense.js
│   │   ├── Offense.js
│   │   ├── Monster.js       # SWARFarm monster data
│   │   ├── Tower.js
│   │   ├── Invitation.js
│   │   └── GuildInventory.js
│   ├── routes/
│   │   ├── auth.js          # Login, register, OAuth callbacks
│   │   ├── users.js         # User management, theme preference
│   │   ├── guilds.js        # Guild CRUD, members, join requests
│   │   ├── defenses.js      # Defense CRUD, monster search, leader skills
│   │   ├── offenses.js      # Offense CRUD, link offenses to defenses
│   │   ├── towers.js        # Tower defense assignment, 4-star restrictions
│   │   ├── inventory.js     # Excel upload for guild monster inventory
│   │   └── invitations.js   # Guild invitation system
│   ├── scripts/
│   │   ├── initAdmin.js     # Create/update admin account
│   │   └── seedMonsters.js  # Import monsters from bestiary.json
│   ├── data/
│   │   └── bestiary.json    # SWARFarm monster database
│   └── server.js            # Express server entry point
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Modal.jsx / .module.css         # Modal, Toast, ConfirmDialog
│   │   │   ├── Navbar.jsx / .module.css        # Navigation bar with theme toggle
│   │   │   ├── DefenseBuilder.jsx / .module.css # Defense creation & management
│   │   │   ├── DefenseDetail.jsx / .module.css  # Defense detail with offenses
│   │   │   ├── GuildCard.jsx / .module.css      # Guild display card
│   │   │   ├── GuildHeader.jsx / .module.css    # Guild info header
│   │   │   ├── GuildWarMap.jsx / .module.css    # War map visualization
│   │   │   ├── GuildRuneStats.jsx / .module.css # Rune statistics & charts
│   │   │   ├── TowerDefenseModal.jsx / .module.css # Tower defense assignment
│   │   │   ├── MembersList.jsx / .module.css    # Guild members list
│   │   │   ├── MemberCard.jsx / .module.css     # Individual member card
│   │   │   ├── AddMemberModal.jsx / .module.css # Add member modal
│   │   │   ├── InvitationCard.jsx / .module.css # Guild invitation card
│   │   │   ├── JoinRequestCard.jsx / .module.css # Join request card
│   │   │   └── guildWarMapConfig.js             # War map tower positions
│   │   ├── pages/
│   │   │   ├── HomePage.jsx / .module.css
│   │   │   ├── LoginPage.jsx / .module.css
│   │   │   ├── DashboardPage.jsx / .module.css
│   │   │   ├── GuildPage.jsx / .module.css
│   │   │   └── AdminPage.jsx / .module.css
│   │   ├── store/
│   │   │   ├── authStore.js   # Auth state (Zustand), syncs theme on login
│   │   │   └── themeStore.js  # Theme state, persists to server + localStorage
│   │   ├── hooks/
│   │   │   ├── useMonsterSearch.js  # Debounced monster search hook
│   │   │   └── usePermissions.js    # Guild permission checks (canManage, canManageItem)
│   │   ├── utils/
│   │   │   └── monsters.js   # getElementColor, formatLeaderSkill helpers
│   │   ├── services/
│   │   │   └── api.js        # Axios instance with auth interceptor, exports API_URL
│   │   ├── App.jsx
│   │   └── index.css         # Global styles & CSS variables
│   └── vite.config.js
└── CLAUDE.md
```

## Data Models (Sequelize)

All models use `underscored: true` (camelCase attributes map to snake_case columns).

### User
```javascript
{
  id: INTEGER (PK, auto-increment),
  name: STRING,
  email: STRING (unique, lowercase),
  password: STRING (hashed, nullable for OAuth),
  provider: 'email' | 'discord' | 'google',
  providerId: STRING,
  role: 'user' | 'guild_leader' | 'admin',
  avatar: STRING,
  guildId: INTEGER (FK),
  username: STRING,
  swData: JSON,
  theme: 'dark' | 'light' (default: 'dark'),
  isActive: BOOLEAN
}
```

### Guild
```javascript
{
  id: INTEGER (PK, auto-increment),
  name: STRING (unique),
  description: TEXT,
  logo: STRING,
  leaderId: INTEGER (FK -> User),
  maxMembers: INTEGER (default: 30),
  isActive: BOOLEAN
}
// Relations: members (many-to-many via GuildMember), subLeaders (via GuildSubLeader), joinRequests (hasMany)
```

### Defense
```javascript
{
  id: INTEGER (PK, auto-increment),
  name: STRING,
  guildId: INTEGER (FK -> Guild),
  createdById: INTEGER (FK -> User),
  monsters: JSON (array of 3 monster objects with com2us_id, name, image, element, natural_stars, leader_skill),
  position: INTEGER (default: 0)
}
```

### Offense
```javascript
{
  id: INTEGER (PK, auto-increment),
  name: STRING,
  guildId: INTEGER (FK -> Guild),
  createdById: INTEGER (FK -> User),
  monsters: JSON (array of 3 monsters),
  generalInstructions: TEXT,
  votesUp: INTEGER,
  votesDown: INTEGER
}
// Relations: defenses (many-to-many via OffenseDefense)
```

### Monster
```javascript
{
  id: INTEGER (PK),
  com2us_id: INTEGER (unique),
  name: STRING,
  element: STRING,
  natural_stars: INTEGER (1-6),
  image_filename: STRING,
  obtainable: BOOLEAN,
  awaken_level: INTEGER,
  leader_skill: JSON
}
// toJSON() builds full image URL from SWARFarm CDN
```

### Tower
```javascript
{
  id: INTEGER (PK, auto-increment),
  towerId: STRING (e.g. "1", "2", "11"),
  guildId: INTEGER (FK -> Guild),
  memo: TEXT
}
// MAX_DEFENSES_PER_TOWER = 5, towers "2", "7", "11" are 4-star max
```

### Junction Tables
- **GuildMember** (guildId, userId) - composite PK
- **GuildSubLeader** (guildId, userId) - composite PK
- **GuildJoinRequest** (id, guildId, userId, message, requestedAt)
- **OffenseDefense** (offenseId, defenseId) - composite PK
- **TowerDefense** (id, towerId, defenseId)

## Roles & Permissions

| Role | Permissions |
|------|-------------|
| `user` | View guilds, request to join, create defenses/offenses in own guild |
| `guild_leader` | Create guild, manage members, promote sub-leaders (max 4) |
| `sub_leader` | Manage defenses, upload inventory, manage tower assignments |
| `admin` | All permissions across all guilds |

## Key Features

### Guild System
- Leaders can create one guild, max 30 members
- Sub-leaders (max 4) can manage defenses and inventory
- Join request system with accept/reject
- Invitation system with expiration
- Hierarchical member display
- Collapsible sections with sidebar navigation (left sidebar with shift-right animation)

### Defense & Offense System
- Create defenses with 3 monsters (with leader skill display)
- Duplicate defense prevention (same 3 monsters blocked)
- Link offenses to defenses (many-to-many)
- Vote system for offenses (up/down)
- Search defenses by name or monster name

### Tower War Map
- Visual guild war map with tower positions
- Assign up to 5 defenses per tower
- 4-star monster restriction on specific towers (2, 7, 11)
- Tower memo for strategy notes

### Monster Inventory
- Upload Excel/CSV files with guild monster data
- Check which players can make a specific defense
- Partial match display (2/3 monsters)

### Theme System
- Dark/light mode toggle
- Per-user persistence (saved to database via `PATCH /users/me/theme`)
- Synced across devices on login
- localStorage fallback before authentication

## Important: Sequelize `_id` Virtual Field
**NEVER** define a `_id` virtual field on a Sequelize model with `underscored: true`.
Sequelize's `snakeCase('_id')` resolves to `'id'`, conflicting with the real `id` column.
The `toJSON()` methods already handle `_id` manually (`values._id = values.id`).

## Common Commands

```bash
# Start backend (from backend/)
npm run dev

# Start frontend (from frontend/)
npm run dev

# Create/update admin account
cd backend && node scripts/initAdmin.js

# Seed monster database
cd backend && node scripts/seedMonsters.js
```

## Environment Variables

### Backend (.env)
```
PORT=5000
JWT_SECRET=your_jwt_secret
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FRONTEND_URL=http://localhost:5173
SUPER_ADMIN_EMAIL=admin@swdef.com
SUPER_ADMIN_PASSWORD=admin123
# Production only:
DATABASE_URL=postgres://...
DB_SSL=true
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
```

## Admin Account
- **Email:** admin@swdef.com
- **Password:** admin123
- Run `node scripts/initAdmin.js` to create/reset

## After Database Reset
1. `node scripts/initAdmin.js` - recreate admin
2. `node scripts/seedMonsters.js` - reimport 2913 monsters
