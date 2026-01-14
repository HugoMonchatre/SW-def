# 🚀 Guide d'Installation Rapide - SW-def

## ✅ Tout est déjà installé et configuré!

Les dépendances ont été installées et les fichiers `.env` sont configurés.

---

## 📋 Prérequis

Avant de lancer l'application, vous devez avoir **MongoDB** installé et en cours d'exécution.

### Option 1: MongoDB Local (Recommandé pour développement)

#### Windows:
1. Télécharger MongoDB: https://www.mongodb.com/try/download/community
2. Installer MongoDB
3. Lancer MongoDB:
   ```bash
   mongod
   ```

#### Ou utiliser MongoDB en arrière-plan (Windows):
   ```bash
   net start MongoDB
   ```

### Option 2: MongoDB Atlas (Cloud - Gratuit)
1. Créer un compte gratuit: https://www.mongodb.com/cloud/atlas/register
2. Créer un cluster gratuit
3. Obtenir votre connection string
4. Modifier `backend/.env` ligne 6:
   ```
   MONGODB_URI=votre_connection_string_atlas
   ```

---

## 🎯 Lancer l'application

### Méthode 1: Script automatique (Windows)
Double-cliquer sur **`start.bat`** à la racine du projet

Cela lancera automatiquement:
- Backend sur http://localhost:5000
- Frontend sur http://localhost:5173

### Méthode 2: Manuellement

#### Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

#### Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

---

## 🔐 Créer le compte Super Admin

Une fois le backend lancé, dans un **nouveau terminal**:

```bash
cd backend
npm run init-admin
```

Cela créera le compte admin avec:
- **Email**: `admin@swdef.com`
- **Password**: `admin123`

---

## 🌐 Accéder à l'application

1. Ouvrir votre navigateur: http://localhost:5173
2. Cliquer sur "Connexion"
3. Se connecter avec:
   - **Email**: `admin@swdef.com`
   - **Password**: `admin123`

---

## 🎉 C'est prêt!

Vous pouvez maintenant:
- ✅ Créer de nouveaux comptes
- ✅ Gérer les utilisateurs (en tant qu'admin)
- ✅ Modifier les rôles
- ✅ Utiliser l'authentification par email

---

## 🔧 Configuration OAuth (Optionnel)

Pour activer Discord et Google:

### Discord:
1. https://discord.com/developers/applications
2. Créer une application
3. Ajouter redirect URI: `http://localhost:5000/api/auth/discord/callback`
4. Copier Client ID et Secret dans `backend/.env`

### Google:
1. https://console.cloud.google.com
2. Créer un projet
3. Activer Google+ API
4. Créer OAuth 2.0 credentials
5. Ajouter redirect URI: `http://localhost:5000/api/auth/google/callback`
6. Copier Client ID et Secret dans `backend/.env`

---

## ❓ Problèmes courants

### "Cannot connect to MongoDB"
→ Vérifiez que MongoDB est démarré: `mongod` ou `net start MongoDB`

### "Port 5000 already in use"
→ Un autre processus utilise le port. Modifier `PORT` dans `backend/.env`

### "Module not found"
→ Réinstaller les dépendances:
```bash
cd backend && npm install
cd ../frontend && npm install
```

---

## 📞 Support

Pour plus d'informations, consultez [README.md](README.md)
