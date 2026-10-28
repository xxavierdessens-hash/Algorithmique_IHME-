import { useMemo } from "react";
import AttendanceControls from "../components/AttendanceControls.jsx";

const HOME_LINKS = [
  { id: "calendar", title: "Calendrier", detail: "Tous les rendez-vous", icon: "◷" },
  { id: "matches", title: "Matchs", detail: "Scores et statistiques", icon: "◎" },
  { id: "trainings", title: "Entraînements", detail: "Séances et exercices", icon: "↗" },
  { id: "progress", title: "Progression", detail: "Évolution de l'équipe", icon: "⌁" },
  { id: "players", title: "Effectif", detail: "Joueurs et postes", icon: "◉" },
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
  attendance,
  attendanceError,
  attendanceLoading,
  trainingError,
  loading,
  onNavigate,
  onOpenTraining,
  onAttendanceChange,
  attendanceSaving,
  profile,
  playerId,
}) {
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return [
      ...matches
        .filter((match) => match.status !== "Terminé")
        .map((match) => ({
          id: `match-${match.id}`,
          eventId: match.id,
          eventType: "Match",
          kind: "match",
          title: `StatsVolley · ${match.opponent}`,
          subtitle: "Match",
          location: match.location || match.venue || "Lieu à confirmer",
          date: new Date(match.match_date),
        })),
      ...trainings.map((training) => ({
        id: `training-${training.id}`,
        eventId: training.id,
        eventType: "Training",
        kind: "training",
        title: training.theme,
        subtitle: "Entraînement",
        location: training.location || "Lieu à confirmer",
        date: new Date(
          `${String(training.date).slice(0, 10)}T${String(training.start_time).slice(0, 5)}`,
        ),
        training,
      })),
    ]
      .filter((event) => !Number.isNaN(event.date.getTime()) && event.date >= now)
      .sort((first, second) => first.date - second.date)
      .slice(0, 8);
  }, [matches, trainings]);

  return (
    <section className="home-page">
      <header className="home-heading">
        <div>
          <p className="eyebrow">ESPACE ÉQUIPE</p>
          <h1>À venir</h1>
          <p className="home-heading__subtitle">
            Les prochains rendez-vous de votre équipe.
          </p>
        </div>
        <button
          className="button button--secondary"
          onClick={() => onNavigate("calendar")}
          type="button"
        >
          Voir le calendrier <span aria-hidden="true">↗</span>
        </button>
      </header>

      <div aria-live="polite" className="upcoming-list">
        {loading ? (
          <p className="status-message">Chargement des prochains événements…</p>
        ) : upcomingEvents.length ? (
          upcomingEvents.map((event) => {
            const eventAttendance = attendance.filter(
              (row) =>
                row.event_type === event.eventType &&
                String(row.event_id) === String(event.eventId),
            );
            return (
              <article
                className={`upcoming-card upcoming-card--${event.kind}`}
                key={event.id}
              >
                <div className="upcoming-card__date">
                  <strong>{event.date.getDate()}</strong>
                  <span>{new Intl.DateTimeFormat("fr-FR", { month: "short" })
                    .format(event.date).replace(".", "")}</span>
                </div>
                <div className="upcoming-card__main">
                  <span className="upcoming-card__eyebrow">{event.subtitle}</span>
                  {event.kind === "training" ? (
                    <button
                      className="upcoming-card__title"
                      onClick={() => onOpenTraining(event.training)}
                      type="button"
                    >{event.title}</button>
                  ) : <strong>{event.title}</strong>}
                  <small>
                    {dateFormatter.format(event.date)} · {timeFormatter.format(event.date)}
                    {" · "}{event.location}
                  </small>
                  {attendanceError ? (
                    <span className="upcoming-card__attendance">Présences indisponibles</span>
                  ) : attendanceLoading ? (
                    <span className="upcoming-card__attendance">Chargement des présences…</span>
                  ) : (
                    <AttendanceControls
                      attendance={eventAttendance}
                      error={attendanceError}
                      eventId={event.eventId}
                      eventType={event.eventType}
                      onChange={onAttendanceChange}
                      playerId={playerId}
                      profile={profile}
                      saving={attendanceSaving}
                    />
                  )}
                </div>
                {event.kind === "training" && <span aria-hidden="true" className="upcoming-card__arrow">↗</span>}
              </article>
            );
          })
        ) : (
          <div className="upcoming-empty">
            <span aria-hidden="true" className="upcoming-empty__icon">◷</span>
            <strong>Aucun événement à venir</strong>
            <p>
              {trainingError ||
                "Ajoutez un match ou un entraînement pour le voir apparaître ici."}
            </p>
            <button
              className="button button--primary"
              onClick={() => onNavigate("calendar")}
              type="button"
            >
              Ouvrir le calendrier
            </button>
          </div>
        )}
      </div>

      {attendanceError && (
        <p className="home-page__notice" role="status">
          Les événements sont chargés, mais les informations de présence ne sont
          pas disponibles pour le moment.
        </p>
      )}

      <div className="home-section-heading">
        <div>
          <p className="eyebrow">ACCÈS RAPIDE</p>
          <h2>Votre espace</h2>
        </div>
      </div>
      <div className="home-grid">
        {HOME_LINKS.map((link) => (
          <button
            className="home-card"
            key={link.id}
            onClick={() => onNavigate(link.id)}
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
