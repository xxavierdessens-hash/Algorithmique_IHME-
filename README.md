# StatsVolley

Application de suivi des matchs et des statistiques d'une équipe de volley-ball.

## Stack

- Frontend : React et Vite
- API : Node.js, Express et `pg`
- Base de données : PostgreSQL
- Développement : Docker Compose

## Démarrage avec Docker

1. Copiez `.env.example` vers `.env` et adaptez les valeurs si nécessaire.
2. À la racine du projet, lancez :

   ```sh
   docker compose up --build
   ```

3. Ouvrez l'application sur [http://localhost:5173](http://localhost:5173).
   L'API est disponible sur [http://localhost:3000/api/health](http://localhost:3000/api/health).

Les données PostgreSQL sont conservées dans le volume Docker `postgres_data`.
Pour arrêter les services sans supprimer les données, utilisez `docker compose down`.
Pour supprimer aussi les données locales de la base, utilisez
`docker compose down --volumes`.

Les identifiants PostgreSQL fournis par défaut sont destinés au développement
local uniquement. Utilisez des secrets adaptés avant tout déploiement.

## Démarrage sans Docker

Prérequis : Node.js récent et PostgreSQL. Créez la base, puis configurez
`backend/.env` avec une variable `DATABASE_URL`, par exemple :

```env
DATABASE_URL=postgres://statsvolley:mot-de-passe@localhost:5432/statsvolley
PORT=3000
```

Dans deux terminaux :

```sh
cd backend
npm install
npm run dev
```

```sh
cd frontend
npm install
npm run dev
```

Le schéma et les données de démonstration sont créés au démarrage de l'API.
La variable `VITE_API_URL` peut être définie côté frontend ; elle vaut
`http://localhost:3000` par défaut.

## Fonctionnalités du squelette

- Calendrier des matchs avec état et lieu.
- Interface live avec compteurs + / - pour attaque, service et bloc.
- Récapitulatif d'un match : points comptés et ratio de réussite à l'attaque.
- Progression saisonnière agrégée par joueur.
- Données de démonstration créées de manière idempotente à l'initialisation.

Les actions enregistrées dans l'interface live sont persistées immédiatement.
Les actions négatives ramènent un compteur au minimum à zéro.

## API initiale

- `GET /api/health` — disponibilité de l'API et de la base.
- `GET /api/matches` — calendrier.
- `GET /api/players` — joueurs.
- `GET /api/statistics/matches/:matchId` — statistiques du match.
- `POST /api/statistics/matches/:matchId/players/:playerId` — incrément ou décrément.
- `GET /api/statistics/progression` — totaux de saison par joueur.

Le corps du POST accepte `{"action":"attack_points","delta":1}`.
Actions permises : `attack_points`, `attack_attempts`, `attack_errors`,
`serve_aces`, `serve_errors`, `block_points`. `delta` doit être `1` ou `-1`.
