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

## Image de déploiement

L'image de production compile le frontend puis le sert depuis Express sur le
port `3000`, sous `/algorithmique-ihme/`. Construisez-la depuis la racine :

```sh
docker build -t statsvolley .
```

Au lancement, fournissez `DATABASE_URL` vers une base PostgreSQL. Le serveur
utilise `PORT` si défini, sinon le port `3000`.

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

- Calendrier des matchs trié par date, ajout via une modale, état, lieu et score.
- Gestion de l'effectif : création, modification et suppression des joueurs.
- Hub d'accueil accessible sur `/`, avec prochain événement et accès aux modules.
- Navigation principale regroupée en six sections : Accueil, Calendrier global, Matchs, Entraînements, Progression et Effectif ; le menu latéral peut être réduit.
- Calendrier global mensuel/hebdomadaire réunissant les matchs et les entraînements.
- Planning de séances d'entraînement, bibliothèque de drills catégorisés et composition d'une séance avec durées.
- Interface live avec compteurs + / - pour le score du set et les actions individuelles, saisie des sets joués par joueur et annulation de la dernière action ; la clôture du match verrouille les statistiques d'action.
- Récapitulatif d'un match et progression par joueur : statistiques totales ou par set, avec saisie/correction des sets joués.
- Progression filtrable par joueur, statistique et période, avec tableau des cumuls, indicateurs, courbe temporelle et profil radar.
- Données de démonstration créées de manière idempotente à l'initialisation.

Les actions enregistrées dans l'interface live sont persistées immédiatement.
Les actions négatives ramènent un compteur au minimum à zéro.

## API initiale

- `GET /api/health` — disponibilité de l'API et de la base.
- `GET /api/matches` — calendrier trié par date.
- `POST /api/matches` — ajoute un match (`opponent`, `match_date`, `location`).
- `PUT /api/matches/:id` — modifie son `status` (`À venir`, `En cours` ou `Terminé`) et/ou son `score_home` / `score_away`.
- `DELETE /api/matches/:id` — supprime un match.
- `GET /api/players` — joueurs triés par numéro.
- `POST /api/players` — ajoute un joueur (`first_name`, `last_name`, `number`, `position`).
- `PUT /api/players/:id` — modifie les informations d'un joueur.
- `DELETE /api/players/:id` — supprime un joueur.
- `GET /api/statistics/matches/:matchId` — statistiques du match.
- `POST /api/statistics/matches/:matchId/players/:playerId` — incrément ou décrément.
- `PUT /api/statistics/matches/:matchId/players/:playerId/sets` — définit les sets joués par un joueur (nombre positif ou nul par pas de 0,5).
- `POST /api/statistics/matches/:matchId/undo` — annule la dernière action enregistrée du match.
- `GET /api/statistics/progression` — totaux de saison par joueur.
- `GET /api/analytics/progression?player_id=all&stat_type=attack_efficiency&period=all` — indicateurs, série par match et profil radar. `player_id` accepte `all` ou un identifiant ; `stat_type` accepte `attack_efficiency`, `kills`, `aces`, `blocks` ou `total_points` ; `period` accepte `all`, `last_3` ou `last_5`.
- `GET /api/trainings` — liste les séances et leurs exercices assemblés.
- `POST /api/trainings` / `PUT /api/trainings/:id` / `DELETE /api/trainings/:id` — crée, modifie ou supprime une séance.
- `PUT /api/trainings/:id/drills` — remplace l'assemblage ordonné des exercices et de leurs durées.
- `GET /api/drills?category=Phase%20K1` — liste les exercices, avec filtre facultatif parmi `Gammes`, `Phase K1`, `Phase K2` et `Situationnel 6x6`.
- `POST /api/drills` — ajoute un exercice personnalisé.

`PUT /api/matches/:id` accepte également `current_set_home` et
`current_set_away` pour persister les points du set en cours. Le score final
(`score_home` / `score_away`) est exprimé en sets.

Le corps du POST accepte `{"action":"attack_points","delta":1}`.
Actions permises : `attack_points`, `attack_attempts`, `attack_errors`,
`serve_aces`, `serve_errors`, `block_points`. `delta` doit être `1` ou `-1`.
