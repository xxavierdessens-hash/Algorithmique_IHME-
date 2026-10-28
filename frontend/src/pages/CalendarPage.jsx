import { useState } from "react";
import AttendanceControls from "../components/AttendanceControls.jsx";
import StatusMessage from "../components/StatusMessage.jsx";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const statusClasses = {
  "À venir": "upcoming",
  "En cours": "live",
  "Terminé": "completed",
};

function localDateTime(value) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export default function CalendarPage({
  matches,
  loading,
  error,
  onOpenMatch,
  onOpenSummary,
  onCreateMatch,
  onUpdateMatch,
  onDeleteMatch,
  attendance,
  attendanceError,
  onAttendanceChange,
  attendanceSaving,
  profile,
  playerId,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creationError, setCreationError] = useState("");
  const [editingMatch, setEditingMatch] = useState(null);
  const [form, setForm] = useState({
    opponent: "",
    match_date: "",
    location: "",
    score_home: "0",
    score_away: "0",
  });
  const orderedMatches = [...matches].sort(
    (first, second) => new Date(first.match_date) - new Date(second.match_date),
  );

  async function submitMatch(event) {
    event.preventDefault();
    setSaving(true);
    setCreationError("");
    try {
      if (editingMatch) {
        if (editingMatch.status === "Terminé") {
          await onUpdateMatch(editingMatch.id, {
            score_home: Number(form.score_home),
            score_away: Number(form.score_away),
          });
        } else {
          await onUpdateMatch(editingMatch.id, {
            opponent: form.opponent,
            match_date: new Date(form.match_date).toISOString(),
            location: form.location,
          });
        }
      } else {
        await onCreateMatch({
          opponent: form.opponent,
          location: form.location,
          match_date: new Date(form.match_date).toISOString(),
        });
      }
      setForm({
        opponent: "",
        match_date: "",
        location: "",
        score_home: "0",
        score_away: "0",
      });
      setEditingMatch(null);
      setModalOpen(false);
    } catch (requestError) {
      setCreationError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Saison 2026–2027</p>
          <h2>Matchs</h2>
        </div>
        <div className="calendar-heading-actions">
          <span className="count-pill">{matches.length} match(s)</span>
          {profile === "Coach" && <button
            className="button button--primary"
            onClick={() => { setCreationError(""); setEditingMatch(null); setModalOpen(true); }}
            type="button"
          >
            Ajouter un match
          </button>}
        </div>
      </div>
      {creationError && (
        <p className="status-message status-message--error" role="alert">{creationError}</p>
      )}
      <StatusMessage loading={loading} error={error}>
        {orderedMatches.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon" aria-hidden="true">◷</span>
            <h3>Le terrain est libre</h3>
            <p>Aucun match au calendrier pour le moment.</p>
          </div>
        ) : (
          <div className="match-list">
            {orderedMatches.map((match) => (
              <article className="match-card" key={match.id}>
                <div className="match-card__date">
                  <span>{dateFormatter.format(new Date(match.match_date))}</span>
                  <span className={`tag tag--${statusClasses[match.status] || "upcoming"}`}>
                    {match.status}
                  </span>
                </div>
                <div className="match-card__main">
                  <div>
                    <p className="eyebrow">{match.location || match.venue || "Lieu à confirmer"}</p>
                    <h3>StatsVolley <span>vs</span> {match.opponent}</h3>
                    {match.status === "Terminé" && (
                      <p className="match-card__score">
                        Score final : {match.score_home} – {match.score_away}
                      </p>
                    )}
                  </div>
                  <div className="match-card__actions">
                    {profile === "Coach" && match.status !== "Terminé" && (
                      <>
                        <button
                          className="button button--secondary"
                          onClick={() => onOpenMatch(match)}
                          type="button"
                        >
                          {match.status === "En cours" ? "Reprendre le live" : "Ouvrir le live"}
                        </button>
                        <button
                          className="button button--secondary"
                          onClick={() => {
                            setCreationError("");
                            setEditingMatch(match);
                            setForm({
                              opponent: match.opponent,
                              match_date: localDateTime(match.match_date),
                              location: match.location || "",
                              score_home: String(match.score_home),
                              score_away: String(match.score_away),
                            });
                            setModalOpen(true);
                          }}
                          type="button"
                        >Modifier</button>
                      </>
                    )}
                    {profile === "Coach" && match.status === "Terminé" && (
                      <button
                        className="button button--secondary"
                        onClick={() => {
                          setCreationError("");
                          setEditingMatch(match);
                          setForm({
                            opponent: match.opponent,
                            match_date: "",
                            location: "",
                            score_home: String(match.score_home),
                            score_away: String(match.score_away),
                          });
                          setModalOpen(true);
                        }}
                        type="button"
                      >
                        Modifier le score
                      </button>
                    )}
                    {match.status === "Terminé" && (
                      <button
                        className="button button--secondary"
                        onClick={() => onOpenSummary(match)}
                        type="button"
                      >Fiche récap</button>
                    )}
                    {profile === "Coach" && (
                      <button
                        className="button button--danger"
                        onClick={async () => {
                          if (!window.confirm(`Supprimer le match contre ${match.opponent} ?`)) return;
                          try {
                            await onDeleteMatch(match.id);
                          } catch (requestError) {
                            setCreationError(requestError.message);
                          }
                        }}
                        type="button"
                      >Supprimer</button>
                    )}
                  </div>
                </div>
                {match.status !== "Terminé" && (
                  <AttendanceControls
                    attendance={attendance}
                    error={attendanceError}
                    eventId={match.id}
                    eventType="Match"
                    onChange={onAttendanceChange}
                    playerId={playerId}
                    profile={profile}
                    saving={attendanceSaving}
                  />
                )}
              </article>
            ))}
          </div>
        )}
      </StatusMessage>

      {modalOpen && profile === "Coach" && (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget && !saving) setModalOpen(false);
          }}
        >
          <section
            aria-labelledby="add-match-title"
            aria-modal="true"
            className="match-modal"
            role="dialog"
          >
            <div className="match-modal__heading">
              <div>
                <p className="eyebrow">Calendrier</p>
                <h2 id="add-match-title">
                  {!editingMatch
                    ? "Ajouter un match"
                    : editingMatch.status === "Terminé"
                      ? "Modifier le score final"
                      : "Modifier le match"}
                </h2>
              </div>
              <button
                aria-label="Fermer"
                className="match-modal__close"
                disabled={saving}
                onClick={() => setModalOpen(false)}
                type="button"
              >×</button>
            </div>
            <form className="match-form" onSubmit={submitMatch}>
              {editingMatch ? (
                editingMatch.status === "Terminé" ? (
                <>
                  <p>StatsVolley vs {editingMatch.opponent}</p>
                  <label>
                    Sets StatsVolley
                    <input min="0" onChange={(event) => setForm({ ...form, score_home: event.target.value })} required type="number" value={form.score_home} />
                  </label>
                  <label>
                    Sets {editingMatch.opponent}
                    <input min="0" onChange={(event) => setForm({ ...form, score_away: event.target.value })} required type="number" value={form.score_away} />
                  </label>
                </>
                ) : (
                  <>
                    <label>
                      Adversaire
                      <input maxLength={120} onChange={(event) => setForm({ ...form, opponent: event.target.value })} required value={form.opponent} />
                    </label>
                    <label>
                      Date et heure
                      <input onChange={(event) => setForm({ ...form, match_date: event.target.value })} required type="datetime-local" value={form.match_date} />
                    </label>
                    <label>
                      Lieu
                      <input maxLength={200} onChange={(event) => setForm({ ...form, location: event.target.value })} value={form.location} />
                    </label>
                  </>
                )
              ) : (
                <>
                  <label>
                    Adversaire
                    <input
                      autoFocus
                      maxLength={120}
                      onChange={(event) => setForm({ ...form, opponent: event.target.value })}
                      required
                      value={form.opponent}
                    />
                  </label>
                  <label>
                    Date et heure
                    <input
                      onChange={(event) => setForm({ ...form, match_date: event.target.value })}
                      required
                      type="datetime-local"
                      value={form.match_date}
                    />
                  </label>
                  <label>
                    Lieu
                    <input
                      maxLength={200}
                      onChange={(event) => setForm({ ...form, location: event.target.value })}
                      placeholder="Gymnase, ville…"
                      value={form.location}
                    />
                  </label>
                </>
              )}
              <div className="match-form__actions">
                <button
                  className="button button--secondary"
                  disabled={saving}
                  onClick={() => setModalOpen(false)}
                  type="button"
                >
                  Annuler
                </button>
                <button className="button button--primary" disabled={saving} type="submit">
                  {saving ? "Enregistrement…" : editingMatch ? "Enregistrer le score" : "Ajouter le match"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
