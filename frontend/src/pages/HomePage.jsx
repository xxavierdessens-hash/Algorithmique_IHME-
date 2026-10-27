import { useMemo } from "react";

const HOME_LINKS = [
  { id: "calendar", title: "Calendrier", detail: "Matchs et rendez-vous", icon: "◷", tone: "mint" },
  { id: "matches", title: "Matchs", detail: "Accès live & fiches récap", icon: "◎", tone: "dark" },
  { id: "trainings", title: "Entraînements", detail: "Séances et exercices", icon: "↗", tone: "blue" },
  { id: "progress", title: "Progression", detail: "Évolution de l'équipe", icon: "⌁", tone: "lavender" },
  { id: "players", title: "Effectif", detail: "Joueurs et postes", icon: "◉", tone: "rose" },
];

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});
export default function HomePage({
  matches,
  trainings,
  trainingError,
  loading,
  onNavigate,
}) {
  const nextEvent = useMemo(() => {
    const now = new Date();
    const events = [
      ...matches
        .filter((match) => match.status !== "Terminé")
        .map((match) => ({
          type: "match",
          title: `Match · StatsVolley vs ${match.opponent}`,
          location: match.location || match.venue || "Lieu à confirmer",
          date: new Date(match.match_date),
          action: () => onNavigate("calendar"),
        })),
      ...trainings.map((training) => ({
        type: "training",
        title: `Entraînement · ${training.theme}`,
        location: training.location,
        date: new Date(`${String(training.date).slice(0, 10)}T${String(training.start_time).slice(0, 5)}`),
        action: () => onNavigate("trainings"),
      })),
    ];
    return events
      .filter((event) => event.date >= now)
      .sort((first, second) => first.date - second.date)[0] ?? null;
  }, [matches, onNavigate, trainings]);

  return (
    <section className="home-page">
      <header className="home-hero">
        <div className="home-hero__copy">
          <p className="eyebrow">STATS VOLLEY · CLUB DASHBOARD</p>
          <h1>Le jeu, <span>en clair.</span></h1>
        </div>
        <div className="home-hero__mark" aria-hidden="true">
          <span>SV</span>
          <i />
          <i />
          <i />
        </div>
      </header>

      <button
        className="next-event"
        disabled={!nextEvent}
        onClick={() => nextEvent?.action()}
        type="button"
      >
        <span className="next-event__label">PROCHAIN ÉVÉNEMENT</span>
        {nextEvent ? (
          <span className="next-event__content">
            <span className="next-event__date">
              <strong>{dateFormatter.format(nextEvent.date)}</strong>
              <small>{timeFormatter.format(nextEvent.date)}</small>
            </span>
            <span className="next-event__details">
              <strong>{nextEvent.title}</strong>
              <small>{nextEvent.location}</small>
            </span>
            <span className="next-event__arrow" aria-hidden="true">↗</span>
          </span>
        ) : (
          <span className="next-event__empty">
            <strong>Aucun événement planifié</strong>
            <small>{loading ? "Chargement des événements…" : trainingError || "Ajoutez un match ou une séance pour le retrouver ici."}</small>
          </span>
        )}
      </button>

      <div className="home-section-heading">
        <div>
          <p className="eyebrow">VOTRE ESPACE</p>
          <h2>Tout au même endroit</h2>
        </div>
        <span>SAISON 2026—2027</span>
      </div>
      <div className="home-grid">
        {HOME_LINKS.map((link, index) => (
          <button
            className={`home-card home-card--${link.tone}`}
            key={link.id}
            onClick={() => onNavigate(link.id)}
            style={{ "--card-index": index }}
            type="button"
          >
            <span className="home-card__top">
              <span className="home-card__icon" aria-hidden="true">{link.icon}</span>
              <span className="home-card__arrow" aria-hidden="true">↗</span>
            </span>
            <span className="home-card__text">
              <strong>{link.title}</strong>
              <small>{link.detail}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
