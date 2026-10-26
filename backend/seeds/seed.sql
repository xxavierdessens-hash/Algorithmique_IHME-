INSERT INTO players (name, jersey_number, position)
VALUES
  ('Camille Martin', 7, 'Passeur'),
  ('Alexandre Bernard', 11, 'Central'),
  ('Lina Petit', 4, 'Réceptionneuse-attaquante'),
  ('Noah Robert', 9, 'Pointu'),
  ('Jade Richard', 2, 'Libéro')
ON CONFLICT (jersey_number) DO NOTHING;

INSERT INTO matches (opponent, venue, match_date, status)
SELECT 'Volley Club Nord', 'Gymnase des Sports', CURRENT_DATE + INTERVAL '7 days', 'scheduled'
WHERE NOT EXISTS (
  SELECT 1 FROM matches WHERE opponent = 'Volley Club Nord'
);
