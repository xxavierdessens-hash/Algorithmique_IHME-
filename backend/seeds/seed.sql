INSERT INTO players (first_name, last_name, number, position)
SELECT seed.first_name, seed.last_name, seed.number, seed.position
FROM (VALUES
  ('Camille', 'Martin', 7, 'Passeur'),
  ('Alexandre', 'Bernard', 11, 'Central'),
  ('Lina', 'Petit', 4, 'R4'),
  ('Noah', 'Robert', 9, 'Pointu'),
  ('Jade', 'Richard', 2, 'Libéro'),
  ('Maxime', 'Durand', 10, 'R4'),
  ('Inès', 'Moreau', 12, 'Central')
) AS seed(first_name, last_name, number, position)
WHERE NOT EXISTS (
  SELECT 1 FROM players existing
  WHERE existing.number = seed.number
     OR (existing.first_name = seed.first_name AND existing.last_name = seed.last_name)
);

INSERT INTO matches (opponent, location, match_date, status)
SELECT seed.opponent, seed.location, seed.match_date, 'À venir'
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
