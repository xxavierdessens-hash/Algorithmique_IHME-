import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";
import StatusMessage from "../components/StatusMessage.jsx";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const monthShortFormatter = new Intl.DateTimeFormat("fr-FR", { month: "short" });

const CATEGORIES = ["Gammes", "Phase K1", "Phase K2", "Situationnel 6x6"];

const emptyTraining = {
  date: "",
  start_time: "18:00",
  end_time: "20:00",
  location: "",
  theme: "",
  notes: "",
};
const emptyDrill = {
  title: "",
  category: "Gammes",
  description: "",
  min_players: "6",
  source_url: "",
};

function localDate(value) {
  return String(value).slice(0, 10);
}

function timeValue(value) {
  return String(value || "").slice(0, 5);
}

function monthShortLabel(value) {
  return monthShortFormatter
    .format(new Date(`${localDate(value)}T12:00:00`))
    .replace(".", "");
}

function TrainingCard({ training, onCompose, onEdit, onDelete }) {
  return (
    <article className="training-card">
      <div className="training-card__date">
        <strong>{new Date(`${localDate(training.date)}T12:00:00`).getDate()}</strong>
        <span>{monthShortLabel(training.date)}</span>
      </div>
      <div className="training-card__main">
        <p className="eyebrow">{training.location}</p>
        <h3>{training.theme}</h3>
        <p className="training-card__meta">
          {dateFormatter.format(new Date(`${localDate(training.date)}T12:00:00`))} · {timeValue(training.start_time)}–{timeValue(training.end_time)}
        </p>
        {training.notes && <p className="training-card__notes">{training.notes}</p>}
        <div className="training-card__drills">
          {(training.drills || []).length
            ? training.drills.map((drill) => (
              <span className="tag" key={drill.id}>
                {drill.title} · {drill.duration_minutes} min
              </span>
            ))
            : <small>Aucun exercice assemblé</small>}
        </div>
      </div>
      <div className="training-card__actions">
        <button className="button button--primary" onClick={() => onCompose(training)} type="button">Composer</button>
        <button className="button button--secondary" onClick={() => onEdit(training)} type="button">Modifier</button>
        <button className="button button--danger" onClick={() => onDelete(training)} type="button">Supprimer</button>
      </div>
    </article>
  );
}

export default function TrainingsPage({
  trainings,
  loadError,
  loading,
  onOpenCalendar,
  onCreateTraining,
  onUpdateTraining,
  onDeleteTraining,
  onTrainingDrillsUpdated,
}) {
  const [tab, setTab] = useState("planning");
  const [drills, setDrills] = useState([]);
  const [drillLoading, setDrillLoading] = useState(true);
  const [drillError, setDrillError] = useState("");
  const [category, setCategory] = useState("Toutes");
  const [editingTraining, setEditingTraining] = useState(null);
  const [trainingForm, setTrainingForm] = useState(emptyTraining);
  const [trainingFormOpen, setTrainingFormOpen] = useState(false);
  const [trainingSaving, setTrainingSaving] = useState(false);
  const [trainingError, setTrainingError] = useState("");
  const [selectedTrainingId, setSelectedTrainingId] = useState("");
  const [assignmentDraft, setAssignmentDraft] = useState({});
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [drillFormOpen, setDrillFormOpen] = useState(false);
  const [drillForm, setDrillForm] = useState(emptyDrill);
  const [drillSaving, setDrillSaving] = useState(false);
  const [customDrillError, setCustomDrillError] = useState("");

  useEffect(() => {
    let active = true;
    api.getDrills()
      .then((result) => {
        if (active) setDrills(result);
      })
      .catch((error) => {
        if (active) setDrillError(error.message);
      })
      .finally(() => {
        if (active) setDrillLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const orderedTrainings = useMemo(() => [...trainings].sort(
    (first, second) =>
      `${localDate(first.date)}T${timeValue(first.start_time)}`.localeCompare(
        `${localDate(second.date)}T${timeValue(second.start_time)}`,
      ),
  ), [trainings]);
  const selectedTraining = trainings.find(
    (training) => String(training.id) === String(selectedTrainingId),
  );
  const visibleDrills = drills.filter(
    (drill) => category === "Toutes" || drill.category === category,
  );
  function startCreateTraining() {
    setEditingTraining(null);
    setTrainingForm(emptyTraining);
    setTrainingError("");
    setTrainingFormOpen(true);
  }

  function startEditTraining(training) {
    setEditingTraining(training);
    setTrainingForm({
      date: localDate(training.date),
      start_time: timeValue(training.start_time),
      end_time: timeValue(training.end_time),
      location: training.location,
      theme: training.theme,
      notes: training.notes || "",
    });
    setTrainingError("");
    setTrainingFormOpen(true);
  }

  async function submitTraining(event) {
    event.preventDefault();
    setTrainingSaving(true);
    setTrainingError("");
    try {
      if (editingTraining) {
        await onUpdateTraining(editingTraining.id, trainingForm);
      } else {
        await onCreateTraining(trainingForm);
      }
      setTrainingFormOpen(false);
      setEditingTraining(null);
    } catch (error) {
      setTrainingError(error.message);
    } finally {
      setTrainingSaving(false);
    }
  }

  function composeTraining(training) {
    setSelectedTrainingId(String(training.id));
    setAssignmentDraft(Object.fromEntries(
      (training.drills || []).map((drill) => [
        drill.id,
        String(drill.duration_minutes),
      ]),
    ));
    setAssignmentError("");
    setTab("library");
  }

  function toggleDrill(drill, checked) {
    setAssignmentDraft((current) => {
      const next = { ...current };
      if (checked) next[drill.id] = next[drill.id] || "10";
      else delete next[drill.id];
      return next;
    });
  }

  async function saveAssembly() {
    if (!selectedTraining) return;
    setAssignmentSaving(true);
    setAssignmentError("");
    try {
      const entries = Object.entries(assignmentDraft).map(([id, duration]) => ({
        drill_id: Number(id),
        duration_minutes: Number(duration),
      }));
      const updatedTraining = await api.replaceTrainingDrills(
        selectedTraining.id,
        entries,
      );
      onTrainingDrillsUpdated(updatedTraining);
    } catch (error) {
      setAssignmentError(error.message);
    } finally {
      setAssignmentSaving(false);
    }
  }

  async function submitDrill(event) {
    event.preventDefault();
    setDrillSaving(true);
    setCustomDrillError("");
    try {
      const created = await api.createDrill({
        ...drillForm,
        min_players: Number(drillForm.min_players),
      });
      setDrills((current) =>
        [...current, created].sort((first, second) =>
          first.category.localeCompare(second.category) ||
          first.title.localeCompare(second.title),
        ),
      );
      setDrillForm(emptyDrill);
      setDrillFormOpen(false);
    } catch (error) {
      setCustomDrillError(error.message);
    } finally {
      setDrillSaving(false);
    }
  }

  async function removeTraining(training) {
    if (!window.confirm(`Supprimer la séance « ${training.theme} » ?`)) return;
    try {
      await onDeleteTraining(training.id);
      if (String(selectedTrainingId) === String(training.id)) {
        setSelectedTrainingId("");
        setAssignmentDraft({});
      }
    } catch (error) {
      setTrainingError(error.message);
    }
  }

  return (
    <section className="training-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Construire, répéter, progresser</p>
          <h2>Entraînements</h2>
        </div>
        {tab === "planning" ? (
          <button className="button button--primary" onClick={startCreateTraining} type="button">
            Nouvelle séance
          </button>
        ) : (
          <button
            className="button button--primary"
            onClick={() => { setCustomDrillError(""); setDrillFormOpen((open) => !open); }}
            type="button"
          >
            {drillFormOpen ? "Fermer le formulaire" : "Créer un exercice"}
          </button>
        )}
      </div>

      <div className="training-tabs" role="tablist" aria-label="Entraînements">
        <button
          aria-selected={tab === "planning"}
          className={tab === "planning" ? "training-tab--active" : ""}
          onClick={() => setTab("planning")}
          role="tab"
          type="button"
        >Planning des séances</button>
        <button
          aria-selected={tab === "library"}
          className={tab === "library" ? "training-tab--active" : ""}
          onClick={() => setTab("library")}
          role="tab"
          type="button"
        >Bibliothèque & séances</button>
      </div>

      {tab === "planning" ? (
        <section className="training-panel">
          <div className="planning-toolbar">
            <span>Matchs et séances réunis dans le calendrier global.</span>
            <button className="button button--secondary" onClick={onOpenCalendar} type="button">
              Ouvrir le calendrier
            </button>
          </div>
          <StatusMessage loading={loading} error={trainingError || loadError}>
            {orderedTrainings.length ? (
              <div className="training-list">
                {orderedTrainings.map((training) => (
                  <TrainingCard
                    key={training.id}
                    onCompose={composeTraining}
                    onDelete={removeTraining}
                    onEdit={startEditTraining}
                    training={training}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-state__icon" aria-hidden="true">◷</span>
                <h3>Le prochain entraînement commence ici</h3>
                <p>Planifiez une séance, puis composez-la avec les exercices de la bibliothèque.</p>
                <button className="button button--primary" onClick={startCreateTraining} type="button">Créer une séance</button>
              </div>
            )}
          </StatusMessage>
        </section>
      ) : (
        <div className="training-library-layout">
          <section className="training-panel">
            {drillFormOpen && (
              <form className="match-form drill-form" onSubmit={submitDrill}>
                <div className="training-panel__heading">
                  <div><p className="eyebrow">Exercice personnalisé</p><h3>Ajouter à la bibliothèque</h3></div>
                </div>
                <label>Titre<input maxLength="160" onChange={(event) => setDrillForm({ ...drillForm, title: event.target.value })} required value={drillForm.title} /></label>
                <label>Catégorie
                  <select onChange={(event) => setDrillForm({ ...drillForm, category: event.target.value })} value={drillForm.category}>
                    {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label>Description<textarea maxLength="4000" onChange={(event) => setDrillForm({ ...drillForm, description: event.target.value })} required rows="3" value={drillForm.description} /></label>
                <label>Joueurs minimum<input max="100" min="1" onChange={(event) => setDrillForm({ ...drillForm, min_players: event.target.value })} required type="number" value={drillForm.min_players} /></label>
                <label>Lien de référence (facultatif)<input onChange={(event) => setDrillForm({ ...drillForm, source_url: event.target.value })} placeholder="https://" type="url" value={drillForm.source_url} /></label>
                {customDrillError && <p className="status-message status-message--error" role="alert">{customDrillError}</p>}
                <div className="match-form__actions">
                  <button className="button button--primary" disabled={drillSaving} type="submit">{drillSaving ? "Enregistrement…" : "Enregistrer l'exercice"}</button>
                </div>
              </form>
            )}
            <div className="training-panel__heading">
              <div><p className="eyebrow">Bibliothèque d'exercices</p><h3>Choisir une catégorie</h3></div>
              <label className="select-label">Filtrer
                <select onChange={(event) => setCategory(event.target.value)} value={category}>
                  <option value="Toutes">Toutes les catégories</option>
                  {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </div>
            <StatusMessage loading={drillLoading} error={drillError}>
              <div className="drill-list">
                {visibleDrills.map((drill) => {
                  const selected = Object.hasOwn(assignmentDraft, drill.id);
                  return (
                    <article className={`drill-card${selected ? " drill-card--selected" : ""}`} key={drill.id}>
                      {selectedTraining && (
                        <input
                          aria-label={`Ajouter ${drill.title} à la séance`}
                          checked={selected}
                          onChange={(event) => toggleDrill(drill, event.target.checked)}
                          type="checkbox"
                        />
                      )}
                      <div className="drill-card__content">
                        <div className="drill-card__top">
                          <span className="tag">{drill.category}</span>
                          {drill.is_custom && <span className="tag tag--custom">Sur mesure</span>}
                        </div>
                        <h4>{drill.title}</h4>
                        <p>{drill.description}</p>
                        <div className="drill-card__footer">
                          <small>{drill.min_players}+ joueurs</small>
                          {drill.source_url && (
                            <a href={drill.source_url} rel="noreferrer" target="_blank">Voir la référence ↗</a>
                          )}
                        </div>
                        {selectedTraining && selected && (
                          <label className="duration-input">
                            Durée · min
                            <input
                              max="600"
                              min="1"
                              onChange={(event) => setAssignmentDraft((current) => ({
                                ...current,
                                [drill.id]: event.target.value,
                              }))}
                              required
                              type="number"
                              value={assignmentDraft[drill.id]}
                            />
                          </label>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </StatusMessage>
          </section>

          <aside className="assembly-panel">
            <p className="eyebrow">ASSEMBLAGE</p>
            <h3>Votre séance</h3>
            {!selectedTraining ? (
              <>
                <p>Choisissez une séance du planning pour composer son contenu.</p>
                <button className="button button--secondary" onClick={() => setTab("planning")} type="button">Voir le planning</button>
              </>
            ) : (
              <>
                <label className="select-label">Séance
                  <select
                    onChange={(event) => {
                      const training = trainings.find((item) => String(item.id) === event.target.value);
                      setSelectedTrainingId(event.target.value);
                      setAssignmentDraft(Object.fromEntries(
                        (training?.drills || []).map((drill) => [drill.id, String(drill.duration_minutes)]),
                      ));
                    }}
                    value={selectedTrainingId}
                  >
                    {orderedTrainings.map((training) => (
                      <option key={training.id} value={training.id}>{localDate(training.date)} · {training.theme}</option>
                    ))}
                  </select>
                </label>
                <strong className="assembly-panel__theme">{selectedTraining.theme}</strong>
                <div className="assembly-summary">
                  <span>{Object.keys(assignmentDraft).length} exercice(s)</span>
                  <strong>
                    {Object.values(assignmentDraft).reduce(
                      (total, duration) => total + (Number(duration) || 0),
                      0,
                    )} min
                  </strong>
                </div>
                {Object.entries(assignmentDraft).map(([id, duration]) => {
                  const drill = drills.find((item) => String(item.id) === String(id));
                  return drill ? (
                    <div className="assembly-item" key={id}>
                      <span>{drill.title}</span><strong>{duration} min</strong>
                    </div>
                  ) : null;
                })}
                {assignmentError && <p className="status-message status-message--error" role="alert">{assignmentError}</p>}
                <button className="button button--primary assembly-save" disabled={assignmentSaving} onClick={saveAssembly} type="button">
                  {assignmentSaving ? "Enregistrement…" : "Enregistrer la séance"}
                </button>
              </>
            )}
          </aside>
        </div>
      )}

      {trainingFormOpen && (
        <div className="modal-backdrop" onClick={(event) => {
          if (event.target === event.currentTarget && !trainingSaving) setTrainingFormOpen(false);
        }}>
          <section aria-labelledby="training-form-title" aria-modal="true" className="match-modal" role="dialog">
            <div className="match-modal__heading">
              <div><p className="eyebrow">Planning des séances</p><h2 id="training-form-title">{editingTraining ? "Modifier la séance" : "Nouvelle séance"}</h2></div>
              <button aria-label="Fermer" className="match-modal__close" disabled={trainingSaving} onClick={() => setTrainingFormOpen(false)} type="button">×</button>
            </div>
            <form className="match-form" onSubmit={submitTraining}>
              <label>Thème<input autoFocus maxLength="160" onChange={(event) => setTrainingForm({ ...trainingForm, theme: event.target.value })} required value={trainingForm.theme} /></label>
              <label>Date<input onChange={(event) => setTrainingForm({ ...trainingForm, date: event.target.value })} required type="date" value={trainingForm.date} /></label>
              <div className="training-time-fields">
                <label>Début<input onChange={(event) => setTrainingForm({ ...trainingForm, start_time: event.target.value })} required type="time" value={trainingForm.start_time} /></label>
                <label>Fin<input onChange={(event) => setTrainingForm({ ...trainingForm, end_time: event.target.value })} required type="time" value={trainingForm.end_time} /></label>
              </div>
              <label>Lieu<input maxLength="200" onChange={(event) => setTrainingForm({ ...trainingForm, location: event.target.value })} required value={trainingForm.location} /></label>
              <label>Notes<textarea maxLength="4000" onChange={(event) => setTrainingForm({ ...trainingForm, notes: event.target.value })} rows="3" value={trainingForm.notes} /></label>
              {trainingError && <p className="status-message status-message--error" role="alert">{trainingError}</p>}
              <div className="match-form__actions">
                <button className="button button--secondary" disabled={trainingSaving} onClick={() => setTrainingFormOpen(false)} type="button">Annuler</button>
                <button className="button button--primary" disabled={trainingSaving} type="submit">{trainingSaving ? "Enregistrement…" : "Enregistrer"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
