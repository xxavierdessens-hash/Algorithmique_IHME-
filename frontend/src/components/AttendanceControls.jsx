const STATUS_OPTIONS = ["Présent", "Absent"];

export function attendanceCounts(rows) {
  const counts = rows.reduce((result, row) => {
    result[row.status] = (result[row.status] || 0) + 1;
    return result;
  }, {});
  return {
    present: counts["Présent"] || 0,
    absent: counts.Absent || 0,
    pending: counts["En attente"] || 0,
  };
}

export default function AttendanceControls({
  eventType,
  eventId,
  attendance,
  profile,
  playerId,
  onChange,
  saving = false,
  error = "",
}) {
  const rows = attendance.filter(
    (row) =>
      row.event_type === eventType &&
      String(row.event_id) === String(eventId),
  );
  const counts = attendanceCounts(rows);
  const currentStatus = rows.find(
    (row) => String(row.player_id) === String(playerId),
  )?.status;
  const canRespond = profile === "Joueur" && Boolean(playerId);

  return (
    <div className="attendance-controls" onClick={(event) => event.stopPropagation()}>
      <p className="attendance-controls__summary" aria-live="polite">
        {counts.present} présent{counts.present === 1 ? "" : "s"} ·{" "}
        {counts.absent} absent{counts.absent === 1 ? "" : "s"} ·{" "}
        {counts.pending} en attente
      </p>
      {canRespond ? (
        <div className="attendance-controls__actions" aria-label="Ma présence">
          {STATUS_OPTIONS.map((status) => (
            <button
              aria-pressed={currentStatus === status}
              className={`button attendance-button${currentStatus === status ? " attendance-button--selected" : ""}`}
              disabled={saving}
              key={status}
              onClick={() => onChange(eventType, eventId, status, playerId)}
              type="button"
            >
              {status}
            </button>
          ))}
        </div>
      ) : profile === "Joueur" ? (
        <span className="attendance-controls__hint">Sélectionnez votre profil joueur pour répondre.</span>
      ) : null}
      {error && <span className="attendance-controls__error" role="status">{error}</span>}
    </div>
  );
}
