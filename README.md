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
