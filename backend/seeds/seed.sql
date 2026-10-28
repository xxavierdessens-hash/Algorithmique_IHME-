INSERT INTO players (first_name, last_name, number, position, role)
SELECT seed.first_name, seed.last_name, seed.number, seed.position, seed.role
FROM (VALUES
  ('Camille', 'Martin', 7, 'Passeur', 'Joueur'),
  ('Alexandre', 'Bernard', 11, 'Central', 'Joueur'),
  ('Lina', 'Petit', 4, 'R4', 'Joueur'),
  ('Noah', 'Robert', 9, 'Pointu', 'Joueur'),
  ('Jade', 'Richard', 2, 'Libéro', 'Joueur'),
  ('Maxime', 'Durand', 10, 'R4', 'Joueur'),
  ('Inès', 'Moreau', 12, 'Central', 'Joueur'),
  ('Thomas', 'Simon', 3, 'R4', 'Joueur'),
  ('Léa', 'Michel', 6, 'Passeur', 'Joueur'),
  ('Hugo', 'Lefebvre', 8, 'Central', 'Joueur'),
  ('Sarah', 'Leroy', 5, 'Libéro', 'Joueur'),
  ('Adam', 'Roux', 1, 'Pointu', 'Joueur'),
  ('Zoé', 'Fontaine', 13, 'R4', 'Invité'),
  ('Marc', 'Dubois', NULL, NULL, 'Coach')
) AS seed(first_name, last_name, number, position, role)
WHERE NOT EXISTS (
  SELECT 1 FROM players existing
  WHERE (seed.number IS NOT NULL AND existing.number = seed.number)
     OR (existing.first_name = seed.first_name AND existing.last_name = seed.last_name)
);

INSERT INTO matches (
  opponent, location, match_date, status, score_home, score_away,
  sets_score, points_detail
)
SELECT seed.opponent, seed.location, seed.match_date, 'Terminé',
       seed.score_home, seed.score_away, seed.sets_score, seed.points_detail
FROM (VALUES
  (
    'Démonstration - Volley Club Ouest', 'Gymnase des Sports',
    CURRENT_DATE - INTERVAL '35 days', 3, 1, '3-1',
    '[{"home":25,"away":21},{"home":22,"away":25},{"home":25,"away":19},{"home":25,"away":20}]'::jsonb
  ),
  (
    'Démonstration - AS Volley Centre', 'Complexe Jean-Moulin',
    CURRENT_DATE - INTERVAL '28 days', 3, 0, '3-0',
    '[{"home":25,"away":18},{"home":25,"away":22},{"home":25,"away":20}]'::jsonb
  ),
  (
    'Démonstration - Racing Volley Sud', 'Gymnase municipal',
    CURRENT_DATE - INTERVAL '21 days', 2, 3, '2-3',
    '[{"home":25,"away":22},{"home":21,"away":25},{"home":25,"away":23},{"home":19,"away":25},{"home":12,"away":15}]'::jsonb
  ),
  (
    'Démonstration - Volley Club Littoral', 'Palais des sports',
    CURRENT_DATE - INTERVAL '14 days', 3, 1, '3-1',
    '[{"home":25,"away":17},{"home":23,"away":25},{"home":25,"away":21},{"home":25,"away":22}]'::jsonb
  ),
  (
    'Démonstration - Union Sportive Est', 'Gymnase des Peupliers',
    CURRENT_DATE - INTERVAL '7 days', 3, 2, '3-2',
    '[{"home":25,"away":20},{"home":20,"away":25},{"home":25,"away":18},{"home":22,"away":25},{"home":15,"away":11}]'::jsonb
  )
) AS seed(opponent, location, match_date, score_home, score_away, sets_score, points_detail)
WHERE NOT EXISTS (
  SELECT 1 FROM matches existing WHERE existing.opponent = seed.opponent
);

INSERT INTO matches (opponent, location, match_date, status, sets_score)
SELECT seed.opponent, seed.location, seed.match_date, 'À venir', '0-0'
FROM (VALUES
  ('Volley Club Nord', 'Gymnase des Sports', CURRENT_DATE + INTERVAL '7 days'),
  ('AS Volley Centre', 'Complexe sportif Jean-Moulin', CURRENT_DATE + INTERVAL '14 days'),
  ('Racing Volley Sud', 'Gymnase municipal', CURRENT_DATE + INTERVAL '21 days'),
  ('Volley Club Littoral', 'Palais des sports', CURRENT_DATE + INTERVAL '28 days'),
  ('Union Sportive Est', 'Gymnase des Peupliers', CURRENT_DATE + INTERVAL '35 days')
) AS seed(opponent, location, match_date)
WHERE NOT EXISTS (
  SELECT 1 FROM matches existing WHERE existing.opponent = seed.opponent
);

UPDATE matches
SET sets_score = score_home::text || '-' || score_away::text
WHERE sets_score IS NULL OR sets_score = '';

INSERT INTO drills (
  title, category, description, min_players, source_url, is_custom
)
SELECT seed.title, seed.category, seed.description, seed.min_players,
       seed.source_url, FALSE
FROM (VALUES
  (
    'Gamme brésilienne',
    'Gammes',
    'Enchaîner manchette, passe et attaque contrôlée en trois couloirs. Faire tourner les rôles après chaque série pour travailler la qualité de balle et le déplacement.',
    6,
    'https://www.learnvolley.com/'
  ),
  (
    'Manchette en déplacement',
    'Gammes',
    'Par binômes, le joueur se déplace entre deux repères pour réceptionner des ballons alternant court et long. Chercher une plateforme stable et une cible constante.',
    4,
    'https://www.learnvolley.com/'
  ),
  (
    'Passe haute en mouvement',
    'Gammes',
    'Les passeurs suivent une trajectoire en triangle, se replacent sous le ballon et distribuent vers une cible fixe. Alterner passe avant et passe arrière.',
    3,
    'https://www.volleyballxl.com/'
  ),
  (
    'Attaque placée sur cibles',
    'Gammes',
    'Après une passe coachée, attaquer en contrôle vers des zones matérialisées. Alterner les trajectoires diagonales et ligne.',
    5,
    'https://www.learnvolley.com/'
  ),
  (
    'Service flottant en séries',
    'Gammes',
    'Réaliser des séries courtes de services flottants en visant différentes zones. Noter les services dans la cible et ajuster le lancer.',
    3,
    'https://www.volleyballxl.com/'
  ),
  (
    'Service-Réception ciblée K1',
    'Phase K1',
    'Six réceptionneurs alternent sur des zones annoncées. Le passeur distribue vers deux options et les attaquants cherchent une cible définie avant chaque série.',
    8,
    'https://www.volleyballxl.com/'
  ),
  (
    'Réception trois couloirs',
    'Phase K1',
    'Trois réceptionneurs communiquent sur des services alternant zones courtes et profondes. Le passeur annonce la cible et l’équipe termine l’échange en side-out.',
    7,
    'https://www.learnvolley.com/'
  ),
  (
    'Relance-passe-attaque K1',
    'Phase K1',
    'Sur balle envoyée par le coach, construire une première attaque à six. Enchaîner la rotation à chaque side-out réussi ou faute directe.',
    8,
    'https://www.volleyballxl.com/'
  ),
  (
    'Choix du passeur en réception',
    'Phase K1',
    'Le passeur reçoit une information de qualité de réception et choisit entre deux options offensives. Les bloqueurs donnent ensuite un retour sur la lisibilité.',
    8,
    'https://www.learnvolley.com/'
  ),
  (
    'K1 avec réception imparfaite',
    'Phase K1',
    'Le coach varie volontairement la qualité de réception. L’équipe adapte sa combinaison et cherche une solution d’attaque sécurisée.',
    8,
    'https://www.volleyballxl.com/'
  ),
  (
    'Chassé-bloc & Transition K2',
    'Phase K2',
    'Après une attaque coachée, les centraux se replacent en chassé-bloc. La défense relance et l’équipe construit une transition complète vers une cible.',
    8,
    'https://www.learnvolley.com/'
  ),
  (
    'Défense diagonale et contre-attaque',
    'Phase K2',
    'Le bloc oriente l’attaque adverse vers une zone défensive. Après la défense, le passeur organise une contre-attaque à trois options.',
    8,
    'https://www.volleyballxl.com/'
  ),
  (
    'Relance défense sur balle haute',
    'Phase K2',
    'Défendre des balles hautes dans différentes zones, garder la relance jouable et construire une attaque de transition.',
    6,
    'https://www.learnvolley.com/'
  ),
  (
    'Bloc-défense sur attaque rapide',
    'Phase K2',
    'Synchroniser la lecture du passeur, le déplacement du bloc et le placement de la défense face à des attaques rapides.',
    8,
    'https://www.volleyballxl.com/'
  ),
  (
    'Transition après couverture',
    'Phase K2',
    'Le coach alterne attaque bloquée et défense relancée. L’équipe couvre son attaquant puis reconstruit immédiatement son système offensif.',
    7,
    'https://www.learnvolley.com/'
  ),
  (
    'Situation 6x6 départ à 22-22',
    'Situationnel 6x6',
    'Jeu complet avec un score de départ à 22-22. Chaque séquence est suivie d’un bref retour collectif sur le choix tactique et la communication.',
    12,
    'https://www.volleyballxl.com/'
  ),
  (
    'Set à handicap de rotation',
    'Situationnel 6x6',
    'Lancer un set avec une rotation imposée et un écart de score défavorable. Travailler la gestion des temps faibles et la communication.',
    12,
    'https://www.learnvolley.com/'
  ),
  (
    'Fin de set avec side-out obligatoire',
    'Situationnel 6x6',
    'Démarrer à 20 points. Une équipe ne marque que sur son service et l’autre doit convertir son K1 pour sortir de la pression.',
    12,
    'https://www.volleyballxl.com/'
  ),
  (
    'Match à thème service-réception',
    'Situationnel 6x6',
    'Jouer un set complet avec bonus pour les services dans une zone annoncée et les side-outs construits sur trois touches.',
    12,
    'https://www.learnvolley.com/'
  ),
  (
    'Défendre un avantage de 23-20',
    'Situationnel 6x6',
    'Rejouer les fins de set en alternant les rôles. L’équipe en avance travaille la discipline tactique, l’autre la prise de risque maîtrisée.',
    12,
    'https://www.volleyballxl.com/'
  )
) AS seed(title, category, description, min_players, source_url)
WHERE NOT EXISTS (
  SELECT 1 FROM drills existing WHERE existing.title = seed.title
);

WITH match_players AS (
  SELECT m.id AS match_id, p.id AS player_id, p.position,
         CASE p.position
           WHEN 'Libéro' THEN 0
           WHEN 'Passeur' THEN floor(random() * 6 + 3)::integer
           WHEN 'Central' THEN floor(random() * 8 + 8)::integer
           ELSE floor(random() * 12 + 14)::integer
         END AS attack_attempts,
         LEAST(5, m.score_home + m.score_away)::numeric(5, 1) AS sets_played
  FROM matches m
  CROSS JOIN players p
  WHERE m.opponent LIKE 'Démonstration - %'
    AND p.role = 'Joueur'
    AND p.active = TRUE
)
INSERT INTO match_player_stats (
  match_id, player_id, attack_points, attack_attempts, attack_errors,
  serve_aces, serve_errors, block_points, sets_played
)
SELECT match_id, player_id,
       CASE
         WHEN position = 'Libéro' THEN 0
         ELSE floor(attack_attempts * CASE position
           WHEN 'Central' THEN 0.28 + random() * 0.18
           WHEN 'Passeur' THEN 0.25 + random() * 0.15
           ELSE 0.30 + random() * 0.18
         END)::integer
       END,
       attack_attempts,
       CASE WHEN attack_attempts = 0 THEN 0 ELSE floor(random() * 3)::integer END,
       CASE WHEN position = 'Libéro'
         THEN floor(random() * 2)::integer
         ELSE floor(random() * 4)::integer
       END,
       CASE WHEN position = 'Libéro'
         THEN floor(random() * 2)::integer
         ELSE floor(random() * 3)::integer
       END,
       CASE
         WHEN position = 'Central' THEN floor(random() * 4 + 1)::integer
         WHEN position = 'Libéro' THEN 0
         ELSE floor(random() * 3)::integer
       END,
       sets_played
FROM match_players
ON CONFLICT (match_id, player_id) DO NOTHING;

WITH season AS (
  SELECT make_date(
    EXTRACT(YEAR FROM CURRENT_DATE)::integer +
      CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) <= 1 THEN 0 ELSE 1 END,
    1,
    31
  ) AS end_date
), training_dates AS (
  SELECT training_date::date AS date, training_time::time AS start_time
  FROM season,
  LATERAL generate_series(
    date_trunc('week', CURRENT_DATE)::date + INTERVAL '1 day',
    season.end_date,
    INTERVAL '7 days'
  ) AS tuesday(training_date)
  CROSS JOIN LATERAL (
    VALUES (tuesday.training_date, TIME '18:30'),
           (tuesday.training_date + INTERVAL '2 days', TIME '18:30')
  ) AS sessions(training_date, training_time)
  WHERE sessions.training_date::date >= CURRENT_DATE
), numbered_dates AS (
  SELECT date, start_time,
         ROW_NUMBER() OVER (ORDER BY date, start_time) AS sequence
  FROM training_dates
)
INSERT INTO trainings (date, start_time, end_time, location, theme, notes)
SELECT date, start_time, start_time + INTERVAL '2 hours',
       'Gymnase des Sports',
       CASE (sequence - 1) % 4
         WHEN 0 THEN 'Séance démonstration - Technique individuelle'
         WHEN 1 THEN 'Séance démonstration - Service et réception'
         WHEN 2 THEN 'Séance démonstration - Bloc et défense'
         ELSE 'Séance démonstration - Jeu collectif 6x6'
       END,
       'Séance de démonstration générée au démarrage.'
FROM numbered_dates
WHERE NOT EXISTS (
  SELECT 1 FROM trainings existing
  WHERE existing.date = numbered_dates.date
    AND existing.start_time = numbered_dates.start_time
);

WITH numbered_trainings AS (
  SELECT t.id, ROW_NUMBER() OVER (ORDER BY t.date, t.start_time) - 1 AS sequence
  FROM trainings t
  WHERE t.notes = 'Séance de démonstration générée au démarrage.'
)
INSERT INTO training_drills (training_id, drill_id, duration_minutes, order_index)
SELECT training.id, drill.id, 20, exercise.order_index
FROM numbered_trainings training
CROSS JOIN LATERAL generate_series(0, 2) AS exercise(order_index)
JOIN LATERAL (
  SELECT id
  FROM drills
  ORDER BY id
  OFFSET ((training.sequence + exercise.order_index) % (SELECT COUNT(*) FROM drills))
  LIMIT 1
) drill ON TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM training_drills existing
  WHERE existing.training_id = training.id
);

INSERT INTO attendance (player_id, event_type, event_id, status)
SELECT p.id, 'Match', m.id, 'En attente'
FROM players p
CROSS JOIN matches m
WHERE p.active = TRUE
  AND m.status <> 'Terminé'
  AND m.match_date >= CURRENT_DATE
ON CONFLICT (player_id, event_type, event_id) DO NOTHING;

INSERT INTO attendance (player_id, event_type, event_id, status)
SELECT p.id, 'Training', t.id, 'En attente'
FROM players p
CROSS JOIN trainings t
WHERE p.active = TRUE
  AND t.date >= CURRENT_DATE
ON CONFLICT (player_id, event_type, event_id) DO NOTHING;
