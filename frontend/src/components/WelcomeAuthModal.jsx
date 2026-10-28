import { useState } from "react";
import { api } from "../api/client.js";

export default function WelcomeAuthModal({ initialMode, onAuthenticated, onClose }) {
  const [mode, setMode] = useState(initialMode);
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function chooseMode(nextMode) {
    setMode(nextMode);
    setError("");
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const profile = mode === "register"
        ? await api.register({ firstname, lastname, email, password })
        : await api.login(email, password);
      onAuthenticated(profile);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function submitCoachDemo(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      onAuthenticated(await api.loginCoachDemo(pin));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  function continueAsGuest() {
    onAuthenticated({
      id: null,
      role: "Invité",
      name: "Invité",
      email: "",
      playerId: null,
      accessToken: null,
    });
  }

  return (
    <div className="modal-backdrop welcome-auth-backdrop">
      <section
        aria-labelledby="welcome-auth-title"
        aria-modal="true"
        className="match-modal welcome-auth"
        role="dialog"
      >
        <button
          aria-label="Fermer"
          className="welcome-auth__close"
          onClick={onClose}
          type="button"
        >×</button>
        <div className="welcome-auth__brand"><span aria-hidden="true">🏐</span> StatsVolley</div>
        <p className="eyebrow">ESPACE ÉQUIPE</p>
        <h1 id="welcome-auth-title">
          {mode === "register" ? "Créer votre compte" : "Bienvenue"}
        </h1>
        <p className="welcome-auth__intro">
          {mode === "register"
            ? "Retrouvez les rendez-vous et les statistiques de votre équipe."
            : "Connectez-vous pour retrouver votre espace StatsVolley."}
        </p>

        <div className="welcome-auth__tabs" role="tablist" aria-label="Compte">
          <button
            aria-selected={mode === "login"}
            className={mode === "login" ? "welcome-auth__tab--active" : ""}
            onClick={() => chooseMode("login")}
            role="tab"
            type="button"
          >Connexion</button>
          <button
            aria-selected={mode === "register"}
            className={mode === "register" ? "welcome-auth__tab--active" : ""}
            onClick={() => chooseMode("register")}
            role="tab"
            type="button"
          >Créer un compte</button>
        </div>

        <form className="match-form welcome-auth__form" onSubmit={submit}>
          {mode === "register" && (
            <div className="welcome-auth__name-fields">
              <label>
                Prénom
                <input
                  autoComplete="given-name"
                  maxLength={100}
                  onChange={(event) => setFirstname(event.target.value)}
                  required
                  value={firstname}
                />
              </label>
              <label>
                Nom
                <input
                  autoComplete="family-name"
                  maxLength={100}
                  onChange={(event) => setLastname(event.target.value)}
                  required
                  value={lastname}
                />
              </label>
            </div>
          )}
          <label>
            Adresse email
            <input
              autoComplete="email"
              autoFocus
              maxLength={254}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="prenom.nom@example.com"
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            Mot de passe
            <input
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              maxLength={128}
              minLength={10}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {error && <p className="status-message status-message--error" role="alert">{error}</p>}
          <button className="button button--primary" disabled={saving} type="submit">
            {saving
              ? "Veuillez patienter…"
              : mode === "register" ? "Créer mon compte" : "Se connecter"}
          </button>
        </form>

        <div className="welcome-auth__separator"><span>accès de démonstration</span></div>
        <form className="match-form welcome-auth__demo" onSubmit={submitCoachDemo}>
          <label>
            Code PIN Coach
            <input
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={12}
              onChange={(event) => setPin(event.target.value)}
              required
              type="password"
              value={pin}
            />
          </label>
          <button className="button button--secondary" disabled={saving} type="submit">
            Accès Démo Coach
          </button>
        </form>

        <button className="welcome-auth__guest" onClick={continueAsGuest} type="button">
          Continuer en tant qu’Invité <span aria-hidden="true">→</span>
        </button>
        <p className="welcome-auth__note">
          Les comptes non liés à l’effectif disposent d’un accès Invité en lecture seule.
          Les accès Coach de démonstration sont destinés à l’évaluation.
        </p>
      </section>
    </div>
  );
}
