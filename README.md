# SW-def - Plateforme d'Authentification

Application full-stack moderne avec authentification multi-providers (Discord, Google, Email) et système de gestion des utilisateurs.

## 🚀 Architecture

### Backend (Node.js + Express)
- **Framework**: Express.js
- **Base de données**: MongoDB avec Mongoose
- **Authentification**: JWT + Passport.js
- **OAuth Providers**: Discord, Google
- **Sécurité**: bcryptjs pour le hachage des mots de passe

### Frontend (React + Vite)
- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Styling**: CSS Modules

## 📁 Structure du projet

```
SW-def/
├── backend/
│   ├── config/
│   │   └── passport.js          # Configuration Passport.js
│   ├── middleware/
│   │   └── auth.js              # Middleware d'authentification
│   ├── models/
│   │   └── User.js              # Modèle utilisateur
│   ├── routes/
│   │   ├── auth.js              # Routes d'authentification
│   │   └── users.js             # Routes gestion utilisateurs
│   ├── .env.example             # Variables d'environnement exemple
│   ├── package.json
│   └── server.js                # Point d'entrée du serveur
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   └── Navbar.module.css
│   │   ├── pages/
│   │   │   ├── HomePage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   └── [styles].module.css
│   │   ├── store/
│   │   │   └── authStore.js     # Store Zustand
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

## 🔧 Installation

### Prérequis
- Node.js (v18 ou supérieur)
- MongoDB (local ou Atlas)
- Comptes développeurs Discord et Google (pour OAuth)

### 1. Cloner le projet
```bash
git clone <votre-repo>
cd SW-def
```

### 2. Configuration Backend

```bash
cd backend
npm install
```

Créer un fichier `.env` à partir de `.env.example`:
```bash
cp .env.example .env
```

Configurer les variables d'environnement:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/sw-def
JWT_SECRET=votre_secret_jwt_super_securise
SESSION_SECRET=votre_secret_session
FRONTEND_URL=http://localhost:5173

# Discord OAuth (obtenir sur https://discord.com/developers/applications)
DISCORD_CLIENT_ID=votre_client_id
DISCORD_CLIENT_SECRET=votre_client_secret
DISCORD_CALLBACK_URL=http://localhost:5000/api/auth/discord/callback

# Google OAuth (obtenir sur https://console.cloud.google.com)
GOOGLE_CLIENT_ID=votre_client_id
GOOGLE_CLIENT_SECRET=votre_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Super Admin par défaut
SUPER_ADMIN_EMAIL=admin@swdef.com
SUPER_ADMIN_PASSWORD=admin123
```

### 3. Configuration Frontend

```bash
cd ../frontend
npm install
```

Créer un fichier `.env`:
```bash
cp .env.example .env
```

Configurer l'URL de l'API:
```env
VITE_API_URL=http://localhost:5000/api
```

### 4. Démarrer MongoDB

```bash
# Si MongoDB est installé localement
mongod
```

Ou utiliser MongoDB Atlas (connexion cloud).

## 🚀 Démarrage

### Lancer le backend
```bash
cd backend
npm run dev
```
Le serveur démarre sur `http://localhost:5000`

### Lancer le frontend
```bash
cd frontend
npm run dev
```
L'application est accessible sur `http://localhost:5173`

## 🔐 Configuration OAuth

### Discord
1. Aller sur https://discord.com/developers/applications
2. Créer une nouvelle application
3. Dans OAuth2, ajouter le redirect URI: `http://localhost:5000/api/auth/discord/callback`
4. Copier le Client ID et Client Secret dans `.env`

### Google
1. Aller sur https://console.cloud.google.com
2. Créer un nouveau projet
3. Activer Google+ API
4. Dans Credentials, créer un OAuth 2.0 Client ID
5. Ajouter le redirect URI: `http://localhost:5000/api/auth/google/callback`
6. Copier le Client ID et Client Secret dans `.env`

## 👥 Système de rôles

### 3 niveaux de rôles:
- **user**: Utilisateur standard
- **moderator**: Modérateur avec permissions intermédiaires
- **admin**: Administrateur avec accès complet

### Compte Super Admin par défaut
- Email: `admin@swdef.com`
- Mot de passe: `admin123`

### Permissions Admin:
- ✅ Voir tous les utilisateurs
- ✅ Modifier les rôles des utilisateurs
- ✅ Activer/désactiver des comptes
- ✅ Supprimer des utilisateurs

## 🛠️ API Endpoints

### Authentication
- `POST /api/auth/register` - Inscription par email
- `POST /api/auth/login` - Connexion par email
- `GET /api/auth/discord` - Connexion Discord OAuth
- `GET /api/auth/google` - Connexion Google OAuth
- `GET /api/auth/me` - Obtenir l'utilisateur connecté
- `POST /api/auth/logout` - Déconnexion

### Users (Admin only)
- `GET /api/users` - Liste tous les utilisateurs
- `GET /api/users/:id` - Obtenir un utilisateur
- `PATCH /api/users/:id/role` - Modifier le rôle
- `PATCH /api/users/:id/status` - Modifier le statut
- `DELETE /api/users/:id` - Supprimer un utilisateur

## 🎨 Fonctionnalités

### ✅ Frontend
- Single Page Application (SPA) avec React
- Authentification multi-providers
- Dashboard avec gestion des utilisateurs (admin)
- Interface moderne et responsive
- Animations fluides
- Protection des routes

### ✅ Backend
- API RESTful avec Express
- Authentification JWT sécurisée
- OAuth 2.0 (Discord, Google)
- Gestion des rôles et permissions
- Validation des données
- Gestion d'erreurs

## 🔒 Sécurité

- Mots de passe hachés avec bcryptjs
- Tokens JWT avec expiration
- Cookies HTTP-only
- CORS configuré
- Protection CSRF
- Validation des entrées
- Permissions basées sur les rôles

## 📦 Production

### Build Frontend
```bash
cd frontend
npm run build
```

### Variables d'environnement Production
- Changer `NODE_ENV=production`
- Utiliser des secrets forts pour JWT et Session
- Configurer les URLs de production
- Utiliser HTTPS
- Configurer MongoDB Atlas

## 🐛 Debug

### Logs Backend
Le serveur affiche:
- ✅ Connexion MongoDB
- 🚀 Démarrage du serveur
- ❌ Erreurs détaillées

### DevTools Frontend
- React DevTools
- Redux DevTools (Zustand)
- Network tab pour les requêtes API

## 📝 TODO

- [ ] Ajouter la récupération de mot de passe
- [ ] Implémenter la vérification par email
- [ ] Ajouter plus de providers OAuth (GitHub, Twitter)
- [ ] System de notifications
- [ ] Logs d'activité des utilisateurs
- [ ] Dashboard analytics

## 📄 License

MIT

## 👨‍💻 Développement

Pour contribuer au projet:
1. Fork le projet
2. Créer une branche feature
3. Commit les changements
4. Push vers la branche
5. Ouvrir une Pull Request
