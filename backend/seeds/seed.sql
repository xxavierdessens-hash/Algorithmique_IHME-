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
