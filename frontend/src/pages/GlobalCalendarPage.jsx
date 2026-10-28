import { useMemo, useState } from "react";
import AttendanceControls from "../components/AttendanceControls.jsx";
import StatusMessage from "../components/StatusMessage.jsx";

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const monthFormatter = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
});
const dayFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});

function localDate(value) {
  return String(value).slice(0, 10);
}

function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function dateKeyFromDate(date) {
  return dateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

export default function GlobalCalendarPage({
  matches,
  trainings,
  loading,
  error,
  onOpenMatch,
  onOpenSummary,
  onOpenTraining,
  attendance,
  attendanceError,
  onAttendanceChange,
  attendanceSaving,
  profile,
  playerId,
}) {
  const [view, setView] = useState("month");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState("");

  const events = useMemo(() => [
    ...matches.map((match) => ({
      id: `match-${match.id}`,
      kind: "match",
      title: `StatsVolley vs ${match.opponent}`,
      date: new Date(match.match_date),
      location: match.location || match.venue || "Lieu à confirmer",
      status: match.status,
      match,
    })),
    ...trainings.map((training) => ({
      id: `training-${training.id}`,
      kind: "training",
      title: training.theme,
      date: new Date(`${localDate(training.date)}T${String(training.start_time).slice(0, 5)}`),
      location: training.location,
      training,
    })),
  ].sort((first, second) => first.date - second.date), [matches, trainings]);

  const days = useMemo(() => {
    const year = anchorDate.getFullYear();
    const month = anchorDate.getMonth();
    if (view === "month") {
      const offset = (new Date(year, month, 1).getDay() + 6) % 7;
      const total = new Date(year, month + 1, 0).getDate();
      const slots = Math.ceil((offset + total) / 7) * 7;
      return Array.from({ length: slots }, (_, index) => {
        const number = index - offset + 1;
        const inMonth = number > 0 && number <= total;
        const key = inMonth ? dateKey(year, month, number) : "";
        return {
          key: `${key || "outside"}-${index}`,
          dateKey: key,
          number,
          inPeriod: inMonth,
        };
      });
    }

    const mondayOffset = (anchorDate.getDay() + 6) % 7;
    const monday = new Date(
      anchorDate.getFullYear(),
      anchorDate.getMonth(),
      anchorDate.getDate() - mondayOffset,
    );
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return {
        key: dateKey(date.getFullYear(), date.getMonth(), date.getDate()),
        dateKey: dateKey(date.getFullYear(), date.getMonth(), date.getDate()),
        number: date.getDate(),
        inPeriod: true,
      };
    });
  }, [anchorDate, view]);

  const eventsByDay = useMemo(() => {
    const byDay = new Map();
    for (const event of events) {
      const key = dateKeyFromDate(event.date);
      byDay.set(key, [...(byDay.get(key) || []), event]);
    }
    return byDay;
  }, [events]);
  const selectedEvents = selectedDate ? eventsByDay.get(selectedDate) || [] : [];

  function shiftPeriod(amount) {
    setAnchorDate((current) => view === "month"
      ? new Date(current.getFullYear(), current.getMonth() + amount, 1)
      : new Date(current.getFullYear(), current.getMonth(), current.getDate() + amount * 7));
    setSelectedDate("");
  }

  function eventAction(event) {
    if (event.kind === "training") {
      onOpenTraining(event.training);
    } else if (event.status === "Terminé") {
      onOpenSummary(event.match);
    } else {
      onOpenMatch(event.match);
    }
  }

  return (
    <section className="global-calendar">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Matchs & entraînements</p>
          <h2>Calendrier</h2>
        </div>
        <div className="view-toggle" aria-label="Période du calendrier">
          <button
            aria-pressed={view === "month"}
            className={view === "month" ? "view-toggle__active" : ""}
            onClick={() => { setView("month"); setSelectedDate(""); }}
            type="button"
          >Mois</button>
          <button
            aria-pressed={view === "week"}
            className={view === "week" ? "view-toggle__active" : ""}
            onClick={() => { setView("week"); setSelectedDate(""); }}
            type="button"
          >Semaine</button>
        </div>
      </div>
      <section className="global-calendar__panel">
        <div className="global-calendar__toolbar">
          <button aria-label="Période précédente" onClick={() => shiftPeriod(-1)} type="button">←</button>
          <h3>
            {view === "month"
              ? monthFormatter.format(anchorDate)
              : `Semaine du ${dayFormatter.format(new Date(`${days[0]?.dateKey}T12:00:00`))}`}
          </h3>
          <button aria-label="Période suivante" onClick={() => shiftPeriod(1)} type="button">→</button>
          <button
            className="global-calendar__today"
            onClick={() => setAnchorDate(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()))}
            type="button"
          >Aujourd’hui</button>
        </div>
        <StatusMessage loading={loading} error={error}>
          <div className={`global-calendar__grid global-calendar__grid--${view}`}>
            {DAY_NAMES.map((day) => <span className="global-calendar__weekday" key={day}>{day}</span>)}
            {days.map((day) => {
              const dayEvents = eventsByDay.get(day.dateKey) || [];
              const matchEvents = dayEvents.filter((event) => event.kind === "match");
              const trainingEvents = dayEvents.filter((event) => event.kind === "training");
              return (
                <button
                  aria-label={day.inPeriod
                    ? `${dayFormatter.format(new Date(`${day.dateKey}T12:00:00`))}, ${dayEvents.length} événement(s)`
                    : undefined}
                  aria-pressed={day.dateKey === selectedDate}
                  className={[
                    "global-calendar__day",
                    day.inPeriod ? "" : "global-calendar__day--outside",
                    matchEvents.length ? "global-calendar__day--match" : "",
                    trainingEvents.length ? "global-calendar__day--training" : "",
                    matchEvents.length && trainingEvents.length ? "global-calendar__day--mixed" : "",
                    day.dateKey === selectedDate ? "global-calendar__day--selected" : "",
                  ].filter(Boolean).join(" ")}
                  disabled={!day.inPeriod}
                  key={day.key}
                  onClick={() => setSelectedDate((current) =>
                    current === day.dateKey ? "" : day.dateKey,
                  )}
                  type="button"
                >
                  {day.inPeriod && (
                    <>
                      <span className="global-calendar__day-number">{day.number}</span>
                      <span className="global-calendar__event-dots">
                        {matchEvents.length > 0 && <i className="global-calendar__dot global-calendar__dot--match" />}
                        {trainingEvents.length > 0 && <i className="global-calendar__dot global-calendar__dot--training" />}
                      </span>
                      {view === "week" && (
                        <span className="global-calendar__day-events">
                          {dayEvents.map((event) => (
                            <span className={`global-calendar__event global-calendar__event--${event.kind}`} key={event.id}>
                              {event.kind === "match" ? timeFormatter.format(event.date) : event.training.start_time.slice(0, 5)}
                              {" · "}{event.title}
                            </span>
                          ))}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </StatusMessage>
        <div className="global-calendar__legend">
          <span><i className="global-calendar__dot global-calendar__dot--match" /> Match</span>
          <span><i className="global-calendar__dot global-calendar__dot--training" /> Entraînement</span>
        </div>
      </section>
      {selectedDate && (
        <section className="global-calendar__selected">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Événements du jour</p>
              <h2>{dayFormatter.format(new Date(`${selectedDate}T12:00:00`))}</h2>
            </div>
          </div>
          {selectedEvents.length ? (
            <div className="global-calendar__event-list">
              {selectedEvents.map((event) => (
                <article className={`global-calendar__event-card global-calendar__event-card--${event.kind}`} key={event.id}>
                  <div>
                    <span className="tag">{event.kind === "match" ? "Match" : "Entraînement"}</span>
                    <h3>{event.title}</h3>
                    <p>{event.location} · {timeFormatter.format(event.date)}</p>
                    {event.kind === "match" && event.status !== "Terminé" && (
                      <AttendanceControls
                        attendance={attendance}
                        error={attendanceError}
                        eventId={event.match.id}
                        eventType="Match"
                        onChange={onAttendanceChange}
                        playerId={playerId}
                        profile={profile}
                        saving={attendanceSaving}
                      />
                    )}
                  </div>
                  {(event.kind === "training" || event.status === "Terminé" || profile === "Coach") && (
                    <button className="button button--secondary" onClick={() => eventAction(event)} type="button">
                      {event.kind === "training"
                        ? "Voir la séance"
                        : event.status === "Terminé" ? "Fiche récap" : "Ouvrir le live"}
                    </button>
                  )}
                </article>
              ))}
            </div>
          ) : <p className="status-message">Aucun événement à cette date.</p>}
        </section>
      )}
    </section>
  );
}
