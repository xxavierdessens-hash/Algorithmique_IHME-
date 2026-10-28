import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import StatusMessage from "../components/StatusMessage.jsx";

const POSITIONS = ["Passeur", "R4", "Central", "Pointu", "Libéro"];
const ROLES = ["Coach", "Joueur", "Invité"];
const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  number: "",
  position: "",
  role: "Joueur",
};

export default function PlayersPage({ canManage = false }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api.getPlayers()
      .then((result) => {
        if (active) setPlayers(result);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function openAddModal() {
    setEditingPlayer(null);
    setForm(EMPTY_FORM);
    setError("");
    setModalOpen(true);
  }

  function openEditModal(player) {
    setEditingPlayer(player);
    setForm({
      first_name: player.first_name,
      last_name: player.last_name,
      number: player.number == null ? "" : String(player.number),
      position: player.position || "",
      role: player.role || "Joueur",
    });
    setError("");
    setModalOpen(true);
  }

  async function submitPlayer(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const playerData = {
      ...form,
      number: form.number === "" ? null : Number(form.number),
      position: form.position || null,
    };
    try {
      const savedPlayer = editingPlayer
        ? await api.updatePlayer(editingPlayer.id, playerData)
        : await api.createPlayer(playerData);
      setPlayers((current) => {
        const updated = editingPlayer
          ? current.map((player) => player.id === savedPlayer.id ? savedPlayer : player)
          : [...current, savedPlayer];
        return updated.sort(
          (first, second) =>
            (first.number ?? Number.POSITIVE_INFINITY) -
            (second.number ?? Number.POSITIVE_INFINITY),
        );
      });
      setModalOpen(false);
      setEditingPlayer(null);
      setForm(EMPTY_FORM);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function removePlayer(player) {
    if (!window.confirm(`Supprimer ${player.first_name} ${player.last_name} de l'effectif ?`)) {
      return;
    }
    setError("");
    try {
      await api.deletePlayer(player.id);
      setPlayers((current) => current.filter((item) => item.id !== player.id));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Équipe première</p>
          <h2>Gestion de l'effectif</h2>
        </div>
        <div className="calendar-heading-actions">
          <span className="count-pill">{players.length} membre(s)</span>
          {canManage && <button className="button button--primary" onClick={openAddModal} type="button">
            Ajouter un joueur
          </button>}
        </div>
      </div>

      <StatusMessage loading={loading} error={!modalOpen ? error : ""}>
        {players.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon" aria-hidden="true">♙</span>
            <h3>L'effectif est à compléter</h3>
            <p>Ajoutez les joueurs de l'équipe pour gérer leurs informations.</p>
          </div>
        ) : (
          <div className="players-grid">
            {players.map((player) => (
              <article className="player-card" key={player.id}>
                <span className="player-card__number">{player.number ?? "—"}</span>
                <div className="player-card__identity">
                  <h3>{player.first_name} {player.last_name}</h3>
                  <span className="tag">{player.role}</span>
                  {player.position && <span className="tag">{player.position}</span>}
                </div>
                {canManage && <div className="player-card__actions">
                  <button
                    aria-label={`Modifier ${player.first_name} ${player.last_name}`}
                    className="button button--secondary"
                    onClick={() => openEditModal(player)}
                    type="button"
                  >
                    Modifier
                  </button>
                  <button
                    aria-label={`Supprimer ${player.first_name} ${player.last_name}`}
                    className="button button--danger"
                    onClick={() => removePlayer(player)}
                    type="button"
                  >
                    Supprimer
                  </button>
                </div>}
              </article>
            ))}
          </div>
        )}
      </StatusMessage>

      {modalOpen && canManage && (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget && !saving) setModalOpen(false);
          }}
        >
          <section
            aria-labelledby="player-modal-title"
            aria-modal="true"
            className="match-modal"
            role="dialog"
          >
            <div className="match-modal__heading">
              <div>
                <p className="eyebrow">Effectif</p>
                <h2 id="player-modal-title">
                  {editingPlayer ? "Modifier un joueur" : "Ajouter un joueur"}
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
            {error && <p className="status-message status-message--error" role="alert">{error}</p>}
            <form className="match-form" onSubmit={submitPlayer}>
              <label>
                Prénom
                <input
                  autoFocus
                  maxLength={80}
                  onChange={(event) => setForm({ ...form, first_name: event.target.value })}
                  required
                  value={form.first_name}
                />
              </label>
              <label>
                Nom
                <input
                  maxLength={80}
                  onChange={(event) => setForm({ ...form, last_name: event.target.value })}
                  required
                  value={form.last_name}
                />
              </label>
              <label>
                Rôle
                <select
                  onChange={(event) => {
                    const role = event.target.value;
                    setForm({
                      ...form,
                      role,
                      ...(role === "Joueur" ? {} : { number: "", position: "" }),
                    });
                  }}
                  required
                  value={form.role}
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </label>
              <label>
                Numéro
                <input
                  max={99}
                  min={1}
                  onChange={(event) => setForm({ ...form, number: event.target.value })}
                  required={form.role === "Joueur"}
                  type="number"
                  value={form.number}
                />
              </label>
              <label>
                Poste
                <select
                  onChange={(event) => setForm({ ...form, position: event.target.value })}
                  required={form.role === "Joueur"}
                  value={form.position}
                >
                  <option disabled value="">Choisir un poste</option>
                  {POSITIONS.map((position) => (
                    <option key={position} value={position}>{position}</option>
                  ))}
                </select>
              </label>
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
                  {saving ? "Enregistrement…" : editingPlayer ? "Enregistrer" : "Ajouter le joueur"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
