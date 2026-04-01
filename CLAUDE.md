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
│   │   ├── GuildInventory.js
│   │   ├── Siege.js
│   │   ├── WeeklySiegeAvailability.js  # Weekly siege availability tracking
│   │   └── Notification.js  # In-app notification system
│   ├── routes/
│   │   ├── auth.js          # Login, register, OAuth callbacks
│   │   ├── users.js         # User management, theme preference
│   │   ├── guilds.js        # Guild CRUD, members, join requests
│   │   ├── defenses.js      # Defense CRUD, monster search, leader skills
│   │   ├── offenses.js      # Offense CRUD, link offenses to defenses
│   │   ├── towers.js        # Tower defense assignment, 4-star restrictions
│   │   ├── inventory.js     # Excel upload for guild monster inventory
│   │   ├── invitations.js   # Guild invitation system
│   │   ├── sieges.js         # Weekly siege availability & selection routes
│   │   └── notifications.js  # Notification CRUD & unread count
│   ├── scripts/
│   │   ├── initAdmin.js     # Create/update admin account
│   │   ├── seedMonsters.js  # Import monsters from bestiary.json
│   │   └── recreateWeeklySiegeTable.js  # Fix table schema migration
│   ├── data/
│   │   └── bestiary.json    # SWARFarm monster database
│   └── server.js            # Express server entry point
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Modal.jsx / .module.css         # Modal, Toast, ConfirmDialog
│   │   │   ├── Navbar.jsx / .module.css        # Navigation bar with theme toggle & notification badge
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
│   │   │   ├── WeeklySiegeWidget.jsx / .module.css # Member weekly availability widget
│   │   │   ├── SiegeManagement.jsx / .module.css   # Leader siege selection interface
│   │   │   ├── NotificationList.jsx / .module.css  # In-app notification display
│   │   │   └── guildWarMapConfig.js             # War map tower positions
│   │   ├── pages/
│   │   │   ├── HomePage.jsx / .module.css
│   │   │   ├── LoginPage.jsx / .module.css
│   │   │   ├── DashboardPage.jsx / .module.css
│   │   │   ├── GuildPage.jsx / .module.css
│   │   │   └── AdminPage.jsx / .module.css
│   │   ├── store/
│   │   │   ├── authStore.js   # Auth state (Zustand), syncs theme on login
│   │   │   ├── themeStore.js  # Theme state, persists to server + localStorage
│   │   │   └── notificationStore.js  # Notification unread count (shared Navbar/Dashboard)
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

### SwData
```javascript
{
  id: INTEGER (PK, auto-increment),
  userId: INTEGER (FK -> User, unique),
  wizardId: INTEGER,
  wizardName: STRING,
  wizardLevel: INTEGER,
  server: STRING,
  lastUpload: DATE,        // = tvalue from JSON (export timestamp), NOT upload time
  unitCount: INTEGER,
  runeCount: INTEGER,
  repUnitImage: STRING,    // SWARFarm CDN URL of representative unit
  bestRuneSets: TEXT,      // JSON via jsonCol() — see note below
  units: TEXT,             // JSON via jsonCol()
  fiveStarLD: TEXT,        // JSON via jsonCol()
  fourStarElemDupes: TEXT, // JSON via jsonCol()
  history: TEXT,           // JSON via jsonCol() — last 10 uploads [{date, runeCount, artefactCount}]
  efficiencyStats: TEXT,   // JSON via jsonCol() — {total, above100..120}
}
```
**Important:** All JSON columns use `DataTypes.TEXT` with explicit `get()`/`set()` via the `jsonCol()` helper
(NOT `DataTypes.JSON`). SQLite columns added via `ALTER TABLE` are not auto-parsed by Sequelize's
`DataTypes.JSON` getter — explicit `JSON.parse`/`JSON.stringify` is required.

### WeeklySiegeAvailability
```javascript
{
  id: INTEGER (PK, auto-increment),
  guildId: INTEGER (FK -> Guild),
  userId: INTEGER (FK -> User),
  weekStartDate: DATEONLY (Saturday of the week),
  mondayAvailable: BOOLEAN (null = not answered),
  thursdayAvailable: BOOLEAN (null = not answered),
  mondaySelected: BOOLEAN (default: false, set by leaders),
  thursdaySelected: BOOLEAN (default: false, set by leaders)
}
// Composite unique index: (guild_id, user_id, week_start_date)
```

### Notification
```javascript
{
  id: INTEGER (PK, auto-increment),
  userId: INTEGER (FK -> User),
  type: ENUM('siege_selection', 'invitation', 'general'),
  message: TEXT,
  relatedId: INTEGER (nullable, FK to related entity),
  isRead: BOOLEAN (default: false)
}
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
| `user` | View guilds, request to join, create defenses/offenses in own guild, set siege availability |
| `guild_leader` | Create guild, manage members, promote sub-leaders (max 4), manage siege selections |
| `sub_leader` | Manage defenses, upload inventory, manage tower assignments, manage siege selections |
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

### Weekly Siege Availability System
- Weekly polling starts every Saturday, members indicate availability for Monday & Thursday sieges
- Deadlines: Sunday 12h for Monday siege, Wednesday 12h for Thursday siege
- Leaders/sub-leaders select up to 25 participants per siege via SiegeManagement component
- After selection, notifications are automatically created for all members who answered
- View toggle (🏰/⚔️) only visible to leaders/sub-leaders, not regular members
- Dashboard widget (WeeklySiegeWidget) auto-hides when both answers are given

### Notification System
- In-app notifications with types: siege_selection, invitation, general
- Auto-created when leaders finalize siege selections (selected/not selected messages)
- NotificationList component on dashboard with mark-as-read and mark-all-as-read
- Red badge on "Dashboard" navbar link showing unread count (polls every 30s)
- Shared state via Zustand notificationStore for real-time badge updates
- Dashboard order: Notifications → Invitations → Profile + SW Data → Siege Availability

### Theme System
- Dark/light mode toggle
- Per-user persistence (saved to database via `PATCH /users/me/theme`)
- Synced across devices on login
- localStorage fallback before authentication

## Important: Sequelize `_id` Virtual Field
**NEVER** define a `_id` virtual field on a Sequelize model with `underscored: true`.
Sequelize's `snakeCase('_id')` resolves to `'id'`, conflicting with the real `id` column.
The `toJSON()` methods already handle `_id` manually (`values._id = values.id`).

## Important: Sequelize sync mode
`sequelize.sync()` is used **without** `{ alter: true }` to avoid Sequelize incorrectly adding
UNIQUE constraints on foreign key columns in SQLite. If a new model is added, the table will be
created automatically. For schema changes on existing tables, use migration scripts
(see `backend/scripts/recreateWeeklySiegeTable.js` as example).

## Important: Adding columns to existing tables
Use the `runMigrations()` function in `server.js`. It runs idempotent `ALTER TABLE` statements on
every startup, catching and ignoring "duplicate column name" errors:

```javascript
async function runMigrations() {
  const migrations = [
    `ALTER TABLE sw_data ADD COLUMN my_new_col TEXT`,
  ];
  for (const sql of migrations) {
    try { await sequelize.query(sql); }
    catch (e) { if (!e.message?.includes('duplicate column name')) throw e; }
  }
}
```
Then chain it after `sequelize.sync()`: `.then(() => sequelize.sync()).then(() => runMigrations())`.

## Rune Efficiency Formula
Formula used (matches setraart.fr reference tool):

```
raw = 1.0                                    // main stat always counts as 1.0
raw += statScore(innate)                     // prefix stat, not grindable
raw += sum(statScore(sub[0], sub[1]+sub[3])) // substats, grind included in value

statScore(statId, value):
  max = SUBSTAT_MAX_CLASSIC[statId]
  flat stats (HP+/ATK+/DEF+ = ids 1,3,5): value / (2 * max)  // half-weighted
  other stats:                              value / max

efficience = round(10000 * raw / 2.8) / 100

// 2.8 = 1.0 (main) + 0.2 (innate, 1 roll at 20% max) + 4×0.4 (subs at 40% max)
// Returns 0 if no subs are revealed yet (raw === 1.0)
```

**Speed tiebreaker:** When two rune combinations have identical current speed, the one with higher
max grind potential (`getRuneMaxSpeed`) wins.

## SW JSON structure (upload)
- `tvalue`: Unix timestamp of the JSON export — used as `lastUpload` (NOT `new Date()`)
- `wizard_info`: wizard metadata (id, name, level, rep_unit_id)
- `runes`: inventory runes
- `unit_list[].runes`: equipped runes (merged with inventory for all calculations)
- `sec_eff[i]`: `[statId, value, enchanted, grind]`

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
