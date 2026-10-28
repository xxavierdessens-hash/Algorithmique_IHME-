# 🏐 StatsVolley — Plateforme d'Analytics & Gestion de Performance Volleyball

![Node.js](https://img.shields.io/badge/Node.js-API-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=20232A)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Recharts](https://img.shields.io/badge/Charts-Recharts-22B5BF)

StatsVolley centralise le suivi d'une équipe de volleyball : planification des matchs et des entraînements, saisie des statistiques en direct, consultation des présences et analyse de la progression individuelle ou collective.

> **Stack vérifiée dans le dépôt :** l'application utilise PostgreSQL (et non SQLite), Recharts (et non Chart.js) et des styles CSS personnalisés. Tailwind CSS et Lucide ne sont pas des dépendances du frontend actuel. Ce README reflète l'implémentation présente.

## Guide d'évaluation — accès de démonstration

Sur l'écran de bienvenue de l'application déployée, choisissez l'un des profils suivants :

| Profil | Comment se connecter | Accès dans l'interface |
|---|---|---|
| **Invité** | Cliquer sur **Continuer en tant qu'Invité** | Consultation en lecture seule |
| **Joueur** | Choisir **Espace Joueur**, puis saisir `x.dessens@gmail.com` | Consultation et déclaration de ses présences |
| **Coach / Entraîneur** | Choisir l'accès Coach, puis cliquer sur **Accès Coach Démo** et saisir `1234` | Outils de gestion et accès au Live Match |
| **Coach par email** | Saisir `xxavier.dessens@gmail.com` dans le formulaire Coach | Accès Coach de démonstration |

Le compte Joueur correspond à **Xavier Dessens**, poste **R4**.

> **Important — démonstration uniquement :** les emails et le PIN servent à sélectionner un profil de démonstration, pas à vérifier une identité. Le profil est mémorisé dans le navigateur. Les restrictions de rôle sont principalement appliquées dans l'interface et ne constituent pas une autorisation sécurisée côté API. Ne réutilisez pas ces identifiants pour protéger des données réelles. Le PIN démo peut être remplacé avec `STATSVOLLEY_COACH_DEMO_PIN`.

## Fonctionnalités

- **Profils et rôles** : choix Invité, Joueur ou Coach, avec mémorisation locale et interface adaptée au profil.
- **Matchs** : calendrier, suivi du score et saisie en direct des statistiques individuelles.
- **Fiche récapitulative** : score, MVP, efficacité d'attaque et tableau des points, attaques, aces, blocs et temps de jeu.
- **Entraînements** : planification des séances, exercices ordonnés et détails des ateliers.
- **Présences** : statuts Présent, Absent ou En attente et récapitulatif des réponses par événement.
- **Analytics et progression** : cartes KPI, filtres par poste, métriques par match et comparaison de plusieurs joueurs avec la moyenne de l'équipe ou du poste.
- **Interface adaptative** : présentation épurée, surfaces claires et navigation responsive.

## Architecture et technologies

| Couche | Technologies présentes |
|---|---|
| Frontend | React 18, Vite 6, React Router, Recharts, CSS |
| API | Node.js, Express 5 |
| Données | PostgreSQL 16, client `pg`, migrations SQL et seed |
| Développement | Docker, Docker Compose |
| CI/CD | GitHub Actions et publication d'image Docker sur GHCR |

Le frontend est servi en développement par Vite et communique avec l'API Express. En production, l'image Docker construit le frontend puis le sert depuis Express. Le déploiement du cours utilise le préfixe `/algorithmique-ihme/`.

## Installation et lancement avec Docker

### Prérequis

- Git
- Docker Desktop ou Docker Engine avec Docker Compose

### Démarrer l'application

1. Cloner le dépôt :

   ```sh
   git clone https://github.com/xxavierdessens-hash/Algorithmique_IHME-.git
   cd Algorithmique_IHME-
   ```

2. Créer le fichier d'environnement local à partir du modèle :

   ```sh
   cp .env.example .env
   ```

   Sous PowerShell, utilisez :

   ```powershell
   Copy-Item .env.example .env
   ```

3. Démarrer les services :

   ```sh
   docker compose up --build
   ```

4. Ouvrir les adresses locales :

   - Application : [http://localhost:5173](http://localhost:5173)
   - Santé de l'API : [http://localhost:3000/api/health](http://localhost:3000/api/health)
   - PostgreSQL : `localhost:5432`

Le schéma et les données de démonstration sont initialisés par l'API au démarrage. PostgreSQL conserve ses données dans le volume Docker `postgres_data`.

Pour arrêter les services sans effacer les données :

```sh
docker compose down
```

Pour supprimer également le volume et les données locales :

```sh
docker compose down --volumes
```

Les paramètres Docker par défaut sont destinés au développement local uniquement. Remplacez-les avant tout usage partagé ou déploiement.

## Lancement sans Docker

### Prérequis

- Une version récente de Node.js et npm
- Une instance PostgreSQL accessible

1. Créer une base PostgreSQL appelée `statsvolley`.
2. Configurer `backend/.env` avec les informations de connexion :

   ```env
   DATABASE_URL=postgres://statsvolley:mot-de-passe@localhost:5432/statsvolley
   PORT=3000
   ```

3. Dans un premier terminal, installer et démarrer l'API :

   ```sh
   cd backend
   npm install
   npm run dev
   ```

4. Dans un second terminal, installer et démarrer le frontend :

   ```sh
   cd frontend
   npm install
   npm run dev
   ```

5. Ouvrir [http://localhost:5173](http://localhost:5173).

En développement, le frontend utilise `http://localhost:3000` par défaut pour joindre l'API. Cette adresse peut être remplacée avec la variable `VITE_API_URL`.

## Données de démonstration

Au premier démarrage, l'API applique la migration de schéma puis le seed de démonstration, chacun une seule fois et dans une transaction. Les scripts appliqués sont consignés dans `app_initialization_scripts` ; les démarrages suivants ne rejouent ni la migration ni le seed. Le seed initialise notamment un effectif de démonstration, des matchs terminés et à venir, des statistiques individuelles, des entraînements et leurs présences. Il ne met pas à jour les comptes joueurs déjà présents ; en cas de numéro, de nom complet ou d'adresse email déjà utilisé, le joueur de démonstration correspondant n'est pas ajouté. Les événements futurs commencent avec le statut **En attente**. Les données métier existantes ne sont pas supprimées par le seed.

Les rôles disponibles sont `Coach`, `Joueur` et `Invité`. Les principaux postes sont `Passeur`, `R4`, `Central`, `Pointu` et `Libéro`.

## API principale

Toutes les routes sont préfixées par `/api`.

| Domaine | Routes utiles |
|---|---|
| Santé | `GET /health` |
| Authentification de démonstration | `POST /auth/player`, `POST /auth/coach`, `POST /auth/coach-demo` |
| Matchs | `GET /matches`, `POST /matches`, `PUT /matches/:id`, `DELETE /matches/:id` |
| Joueurs | `GET /players`, `POST /players`, `PUT /players/:id`, `DELETE /players/:id` |
| Statistiques | `GET /statistics/matches/:matchId`, `POST /statistics/matches/:matchId/players/:playerId`, `GET /statistics/progression` |
| Analytics | `GET /analytics/progression` |
| Entraînements | `GET /trainings`, `POST /trainings`, `PUT /trainings/:id`, `DELETE /trainings/:id` |
| Exercices | `GET /drills`, `POST /drills`, `PUT /trainings/:id/drills` |
| Présences | `GET /attendance`, `PUT /attendance` |

L'endpoint Analytics accepte les filtres `player_id`, `stat_type`, `period` et `position`. Les métriques disponibles sont l'efficacité d'attaque, les points, les aces et les blocs; les périodes incluent tous les matchs, les trois derniers ou les cinq derniers.

## Build du frontend

Depuis le dossier `frontend` :

```sh
npm run build
```

Les fichiers de production sont générés dans `frontend/dist`.

## Déploiement

Le workflow GitHub Actions du dépôt construit et publie l'image sur GitHub Container Registry. Le déploiement sur le serveur du cours est déclenché manuellement avec l'option **Déployer**. Les secrets et variables de déploiement doivent être configurés dans les paramètres GitHub du dépôt; ils ne doivent pas être ajoutés au code source.

L'image de production peut également être construite depuis la racine du dépôt :

```sh
docker build -t statsvolley .
```

Elle nécessite `DATABASE_URL` vers une base PostgreSQL au démarrage et utilise `PORT` si défini, sinon le port `3000`.
