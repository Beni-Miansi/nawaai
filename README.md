# NexaAI — Chatbot intelligent

Application web de chatbot propulsée par **Groq** (Llama, Qwen) avec authentification, historique persisté, streaming des réponses et interface moderne.

---

## Fonctionnalités

- **Authentification** — inscription / connexion sécurisée (JWT + bcrypt)
- **Streaming des réponses** — affichage progressif token par token (SSE)
- **8 assistants spécialisés** — général, code, traducteur, résumeur, maths, rédaction, productivité, recherche
- **3 modèles IA** — Llama 3.3 70B, Llama 4 Scout 17B, Qwen 3 32B
- **Historique persisté** — SQLite, chargé automatiquement à la connexion
- **Recherche dans l'historique** — filtrage en temps réel des messages
- **Nommage automatique** — le titre de la conversation s'affiche dans le header
- **Interface responsive** — thème sombre, sidebar mobile, markdown rendu
- **Sécurité** — rate limiting, validation des entrées, protection XSS

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | Node.js 20, Express 4 |
| Base de données | SQLite (better-sqlite3) |
| IA | Groq API (compatible OpenAI SDK) |
| Auth | JWT + bcrypt + cookies HTTP-only |
| Sécurité | express-rate-limit |
| Frontend | HTML5, CSS3, JavaScript vanilla |
| Déploiement | Docker, Render, GitHub Actions |

---

## Installation locale

### Prérequis
- Node.js 20+
- Clé API Groq gratuite → [console.groq.com](https://console.groq.com)

### Étapes

```bash
# 1. Cloner le dépôt
git clone https://github.com/VOTRE_USERNAME/nexaai.git
cd nexaai

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env
# Éditez .env et renseignez GROQ_API_KEY et JWT_SECRET

# 4. Lancer le serveur
npm start
```

Ouvrez [http://localhost:3000](http://localhost:3000)

Pour le développement avec rechargement automatique :
```bash
npm run dev
```

---

## Configuration

Créez un fichier `.env` à la racine du projet :

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PORT=3000
JWT_SECRET=une-longue-chaine-aleatoire-secrete
```

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Clé API Groq (obligatoire) — [console.groq.com](https://console.groq.com) |
| `PORT` | Port d'écoute du serveur (défaut : 3000) |
| `JWT_SECRET` | Secret de signature des tokens JWT (obligatoire, changez-le !) |

---

## Déploiement

### Docker

```bash
# Construire l'image
docker build -t nexaai .

# Lancer avec les variables d'environnement
docker run -p 3000:3000 \
  -e GROQ_API_KEY=gsk_xxx \
  -e JWT_SECRET=votre-secret \
  -v nexaai_data:/usr/src/app/data \
  nexaai
```

### Render (recommandé)

1. Forkez ce dépôt sur GitHub
2. Créez un compte sur [render.com](https://render.com)
3. **New → Web Service** → connectez votre dépôt GitHub
4. Render détecte automatiquement le `render.yaml`
5. Ajoutez les variables d'environnement dans **Environment** :
   - `GROQ_API_KEY`
   - `JWT_SECRET`
6. Cliquez **Deploy**

> Pour la persistance SQLite en production, ajoutez un **Disk** dans Render (dossier `/usr/src/app/data`).

### Variables d'environnement sur Render

| Variable | Valeur |
|----------|--------|
| `GROQ_API_KEY` | Votre clé Groq |
| `JWT_SECRET` | Chaîne aléatoire longue |
| `NODE_ENV` | `production` |

---

## Structure du projet

```
nexaai/
├── server.js          # Serveur Express (API, auth, streaming)
├── db.js              # Initialisation SQLite
├── public/
│   ├── index.html     # Page de connexion
│   ├── register.html  # Page d'inscription
│   ├── chat.html      # Interface principale
│   ├── chat.js        # Logique chat + streaming + recherche
│   ├── login.js       # Gestion connexion
│   ├── register.js    # Gestion inscription
│   └── style.css      # Thème sombre complet
├── Dockerfile         # Image Docker production
├── render.yaml        # Config déploiement Render
├── .env.example       # Template variables d'environnement
└── .github/
    └── workflows/
        └── nodejs.yml # CI GitHub Actions
```

---

## API

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/api/auth/register` | Non | Créer un compte |
| POST | `/api/auth/login` | Non | Se connecter |
| POST | `/api/auth/logout` | Non | Se déconnecter |
| GET | `/api/auth/me` | Oui | Infos utilisateur |
| GET | `/api/templates` | Non | Liste des assistants |
| POST | `/api/chat` | Oui | Envoyer un message (SSE) |
| GET | `/api/history` | Oui | Historique des messages |
| GET | `/api/history/search?q=` | Oui | Rechercher dans l'historique |
| POST | `/api/history/clear` | Oui | Effacer l'historique |
| GET | `/api/health` | Non | État du serveur |

---

## Licence

MIT
