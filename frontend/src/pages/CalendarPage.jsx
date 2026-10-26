import StatusMessage from "../components/StatusMessage.jsx";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

export default function CalendarPage({ matches, loading, error, onOpenMatch }) {
  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Saison 2026–2027</p>
          <h2>Calendrier des matchs</h2>
        </div>
        <span className="count-pill">{matches.length} match(s)</span>
      </div>
      <StatusMessage loading={loading} error={error}>
        {matches.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon" aria-hidden="true">◷</span>
            <h3>Le terrain est libre</h3>
            <p>Aucun match au calendrier pour le moment.</p>
          </div>
        ) : (
          <div className="match-list">
            {matches.map((match) => (
              <article className="match-card" key={match.id}>
                <div className="match-card__date">
                  <span>{dateFormatter.format(new Date(match.match_date))}</span>
                  <span className={`tag tag--${match.status}`}>{match.status}</span>
                </div>
                <div className="match-card__main">
                  <div>
                    <p className="eyebrow">{match.venue || "Lieu à confirmer"}</p>
                    <h3>StatsVolley <span>vs</span> {match.opponent}</h3>
                  </div>
                  <button
                    className="button button--secondary"
                    onClick={() => onOpenMatch(match)}
                    type="button"
                  >
                    {match.status === "live" ? "Reprendre le live" : "Voir le match"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </StatusMessage>
    </section>
  );
}
