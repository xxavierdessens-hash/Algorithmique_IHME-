import AttendanceControls, {
  attendanceCounts,
} from "./AttendanceControls.jsx";

function clockLabel(minutes) {
  return `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(
    minutes % 60,
  ).padStart(2, "0")}`;
}

export default function TrainingDetailModal({
  training,
  attendance,
  attendanceError,
  profile,
  playerId,
  attendanceSaving,
  onAttendanceChange,
  onClose,
}) {
  const rows = attendance.filter(
    (row) =>
      row.event_type === "Training" &&
      String(row.event_id) === String(training.id),
  );
  const counts = attendanceCounts(rows);
  const startsAt = new Date(
    `${String(training.date).slice(0, 10)}T${String(training.start_time).slice(0, 5)}`,
  );
  const activeProfile = startsAt >= new Date() ? profile : "Invité";
  const drills = [...(training.drills || [])].sort(
    (first, second) => first.order_index - second.order_index,
  );
  let startMinutes = Number(String(training.start_time).slice(0, 2)) * 60 +
    Number(String(training.start_time).slice(3, 5));

  return (
    <div
      className="modal-backdrop training-detail-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="training-detail-title"
        aria-modal="true"
        className="match-modal training-detail"
        role="dialog"
      >
        <div className="match-modal__heading">
          <div>
            <p className="eyebrow">Détail de la séance</p>
            <h2 id="training-detail-title">{training.theme}</h2>
            <p className="training-detail__meta">
              {new Intl.DateTimeFormat("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(new Date(`${String(training.date).slice(0, 10)}T12:00:00`))}
              {" · "}{String(training.start_time).slice(0, 5)}–{String(training.end_time).slice(0, 5)}
              {" · "}{training.location}
            </p>
          </div>
          <button
            aria-label="Fermer le détail de la séance"
            className="match-modal__close"
            onClick={onClose}
            type="button"
          >×</button>
        </div>

        <AttendanceControls
          attendance={attendance}
          eventId={training.id}
          eventType="Training"
          onChange={onAttendanceChange}
          playerId={playerId}
          profile={activeProfile}
          saving={attendanceSaving}
          error={attendanceError}
        />

        <section className="training-detail__attendance" aria-label="Récapitulatif des présences">
          <h3>Présences</h3>
          <div className="training-detail__attendance-grid">
            {["Présent", "Absent"].map((status) => (
              <div key={status}>
                <strong>{status} · {status === "Présent" ? counts.present : counts.absent}</strong>
                <ul>
                  {rows.filter((row) => row.status === status).map((row) => (
                    <li key={row.player_id}>{row.first_name} {row.last_name}</li>
                  ))}
                  {!rows.some((row) => row.status === status) && <li>Aucun joueur</li>}
                </ul>
              </div>
            ))}
          </div>
          <p>{counts.pending} joueur{counts.pending === 1 ? "" : "s"} en attente de réponse</p>
        </section>

        <section className="training-detail__timeline" aria-label="Déroulement des exercices">
          <h3>Déroulement chronologique</h3>
          {drills.length ? (
            <ol>
              {drills.map((drill, index) => {
                const duration = Number(drill.duration_minutes) || 0;
                const start = startMinutes;
                const end = start + duration;
                startMinutes = end;
                return (
                  <li className="training-detail__drill" key={drill.id}>
                    <span className="training-detail__drill-index">{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <div className="training-detail__drill-heading">
                        <h4>{drill.title}</h4>
                        <span>{clockLabel(start)}–{clockLabel(end)} · {duration} min</span>
                      </div>
                      <span className="tag">{drill.category}</span>
                      <p><strong>Objectif pédagogique :</strong> {drill.description}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="status-message">Aucun exercice n’a encore été ajouté à cette séance.</p>
          )}
        </section>
        {training.notes && (
          <section className="training-detail__notes">
            <h3>Notes du coach</h3>
            <p>{training.notes}</p>
          </section>
        )}
      </section>
    </div>
  );
}
