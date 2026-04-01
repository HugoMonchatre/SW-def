# SW-def — Plateforme de gestion de guilde Summoners War

Application full-stack de gestion de guerre de guilde pour Summoners War. Permet de gérer les défenses, offenses, tours, inventaire de monstres, disponibilités de siège hebdomadaires et statistiques de runes.

## Architecture

### Backend (Node.js + Express)
- **Runtime**: Node.js avec Express
- **Base de données**: SQLite (dev) / PostgreSQL (prod, OVH) via Sequelize ORM
- **Authentification**: JWT + Passport.js (Discord, Google, Email/password)
- **Sécurité**: bcryptjs pour le hachage des mots de passe

### Frontend (React + Vite)
- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: Zustand
- **HTTP Client**: Axios (instance centralisée dans `services/api.js`)
- **Styling**: CSS Modules avec variables CSS pour le thème dark/light

## Structure du projet

```
SW-def/
├── backend/
│   ├── config/
│   │   ├── database.js          # Config Sequelize (SQLite dev / PostgreSQL prod)
│   │   ├── env.js               # Chargement des variables d'environnement
│   │   └── passport.js          # Stratégies OAuth Discord & Google
│   ├── middleware/
│   │   ├── auth.js              # JWT authenticate, authorize, parseId
│   │   ├── validate.js          # Schémas de validation (Joi)
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── index.js             # Associations & tables de jointure
│   │   ├── User.js
│   │   ├── Guild.js
│   │   ├── Defense.js
│   │   ├── Offense.js
│   │   ├── Monster.js           # Données SWARFarm
│   │   ├── Tower.js
│   │   ├── SwData.js            # Données SW uploadées (JSON export)
│   │   ├── Invitation.js
│   │   ├── GuildInventory.js
│   │   ├── Siege.js
│   │   ├── WeeklySiegeAvailability.js
│   │   └── Notification.js
│   ├── routes/
│   │   ├── auth.js              # Login, register, callbacks OAuth
│   │   ├── users.js             # Profil, thème, upload JSON SW
│   │   ├── guilds.js            # CRUD guilde, membres, demandes d'adhésion
│   │   ├── defenses.js          # CRUD défenses, recherche monstres
│   │   ├── offenses.js          # CRUD offenses, vote
│   │   ├── towers.js            # Assignation tours, restriction 4*
│   │   ├── inventory.js         # Upload Excel inventaire guilde
│   │   ├── invitations.js       # Système d'invitations
│   │   ├── sieges.js            # Disponibilités hebdomadaires & sélection
│   │   └── notifications.js     # CRUD notifications in-app
│   ├── services/
│   │   ├── runeCalculator.js    # Calcul efficience & meilleurs sets de runes
│   │   └── runWorker.js         # Worker thread pour calcul asynchrone
│   ├── scripts/
│   │   ├── initAdmin.js         # Créer/réinitialiser le compte admin
│   │   └── seedMonsters.js      # Importer les monstres depuis bestiary.json
│   ├── data/
│   │   └── bestiary.json        # Base de données monstres SWARFarm (2913 monstres)
│   └── server.js                # Point d'entrée Express + runMigrations()
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx / .module.css
│   │   │   ├── DefenseBuilder.jsx / .module.css
│   │   │   ├── DefenseDetail.jsx / .module.css
│   │   │   ├── GuildCard.jsx / .module.css
│   │   │   ├── GuildHeader.jsx / .module.css
│   │   │   ├── GuildWarMap.jsx / .module.css
│   │   │   ├── GuildRuneStats.jsx / .module.css
│   │   │   ├── TowerDefenseModal.jsx / .module.css
│   │   │   ├── MembersList.jsx / .module.css
│   │   │   ├── MemberCard.jsx / .module.css
│   │   │   ├── WeeklySiegeWidget.jsx / .module.css
│   │   │   ├── SiegeManagement.jsx / .module.css
│   │   │   ├── NotificationList.jsx / .module.css
│   │   │   └── guildWarMapConfig.js
│   │   ├── pages/
│   │   │   ├── HomePage.jsx / .module.css
│   │   │   ├── LoginPage.jsx / .module.css
│   │   │   ├── DashboardPage.jsx / .module.css
│   │   │   ├── GuildPage.jsx / .module.css
│   │   │   └── AdminPage.jsx / .module.css
│   │   ├── store/
│   │   │   ├── authStore.js
│   │   │   ├── themeStore.js
│   │   │   └── notificationStore.js
│   │   ├── hooks/
│   │   │   ├── useMonsterSearch.js
│   │   │   └── usePermissions.js
│   │   ├── services/
│   │   │   └── api.js           # Instance Axios avec intercepteur auth
│   │   └── utils/
│   │       └── monsters.js
│   └── vite.config.js
│
└── README.md
```

## Fonctionnalités

### Gestion de guilde
- Création de guilde (1 par leader, max 30 membres)
- Sous-leaders (max 4) avec gestion des défenses et inventaire
- Système de demandes d'adhésion + invitations avec expiration

### Défenses & Offenses
- Création de défenses avec 3 monstres (affichage des compétences de leader)
- Détection des doublons de défenses
- Association offenses ↔ défenses (many-to-many)
- Système de vote pour les offenses (up/down)

### Carte de guerre
- Visualisation de la carte de guilde avec positions des tours
- Assignation jusqu'à 5 défenses par tour
- Restriction monstres 4* sur les tours 2, 7 et 11

### Inventaire de monstres
- Upload Excel/CSV avec l'inventaire de la guilde
- Vérification des joueurs pouvant réaliser une défense

### Disponibilités de siège hebdomadaires
- Sondage chaque semaine (départ le samedi)
- Membres indiquent leur disponibilité lundi/jeudi
- Délais : dimanche 12h (lundi), mercredi 12h (jeudi)
- Leaders/sous-leaders sélectionnent jusqu'à 25 participants par siège
- Notifications automatiques après finalisation de la sélection

### Statistiques de runes (upload JSON SW)
- Upload du fichier JSON exporté depuis Summoners War
- Affichage des meilleurs sets de runes par vitesse : Swift, Swift/Will, Violent, Violent/Will, Despair, Despair/Will
- Tiebreaker : en cas d'égalité de vitesse courante, priorité au potentiel max (avec meulage)
- Calcul d'efficience des runes selon la formule standard :
  - Main stat = 1.0 (base fixe)
  - Stats plates (HP+, ATK+, DEF+) comptent pour moitié
  - `efficience = round(10000 × raw / 2.8) / 100`
  - `2.8` = 1.0 (main) + 0.2 (innate, 1 roll) + 4×0.4 (sous-stats à 40% du max)
- Date du JSON affiché (champ `tvalue` = timestamp d'export)
- Historique des uploads (sparkline)

### Notifications in-app
- Badge rouge sur le lien Dashboard (Zustand, polling 30s)
- Notifications auto à la finalisation des sélections de siège
- Types : siege_selection, invitation, general

### Thème dark/light
- Persistance en base par utilisateur
- Synchronisation multi-appareils à la connexion

## Commandes

```bash
# Backend (depuis backend/)
npm run dev

# Frontend (depuis frontend/)
npm run dev

# Créer/réinitialiser le compte admin
cd backend && node scripts/initAdmin.js

# Importer les monstres
cd backend && node scripts/seedMonsters.js
```

## Variables d'environnement

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
# Production uniquement :
DATABASE_URL=postgres://...
DB_SSL=true
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
```

## Compte admin
- **Email :** admin@swdef.com
- **Mot de passe :** admin123
- Lancer `node scripts/initAdmin.js` pour créer ou réinitialiser

## Après une remise à zéro de la base
1. `node scripts/initAdmin.js` — recréer l'admin
2. `node scripts/seedMonsters.js` — réimporter les 2913 monstres
