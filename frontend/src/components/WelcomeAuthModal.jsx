import { useState } from "react";
import { api } from "../api/client.js";

export default function WelcomeAuthModal({ onAuthenticated }) {
  const [mode, setMode] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [emailError, setEmailError] = useState("");
  const [demoError, setDemoError] = useState("");
  const [saving, setSaving] = useState(false);

  function chooseMode(nextMode) {
    setMode(nextMode);
    setEmail("");
    setPin("");
    setEmailError("");
    setDemoError("");
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setEmailError("");
    try {
      const profile = mode === "player"
        ? await api.loginPlayer(email)
        : await api.loginCoach(email);
      onAuthenticated(profile);
    } catch (requestError) {
      setEmailError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function submitCoachDemo(event) {
    event.preventDefault();
    setSaving(true);
    setDemoError("");
    try {
      onAuthenticated(await api.loginCoachDemo(pin));
    } catch (requestError) {
      setDemoError(requestError.message);
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
        <div className="welcome-auth__brand">
          <span className="brand__mark">SV</span>
          <span>stats<span className="brand__accent">volley</span></span>
        </div>
        <p className="eyebrow">ESPACE ÉQUIPE</p>
        <h1 id="welcome-auth-title">Bienvenue</h1>
        <p className="welcome-auth__intro">
          Choisissez votre espace pour consulter les matchs et les entraînements.
        </p>

        {!mode ? (
          <div className="welcome-auth__choices">
            <button className="button button--primary" onClick={continueAsGuest} type="button">
              Continuer en tant qu’Invité
            </button>
            <button className="button button--secondary" onClick={() => chooseMode("player")} type="button">
              Espace Joueur
            </button>
            <button className="button button--secondary" onClick={() => chooseMode("coach")} type="button">
              Accès Coach / Entraîneur
            </button>
          </div>
        ) : (
          <>
            <form className="match-form welcome-auth__form" onSubmit={submit}>
              <label>
                {mode === "player" ? "Email du joueur" : "Email Coach"}
                <input
                  autoComplete="email"
                  autoFocus
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={mode === "player" ? "prenom.nom@example.com" : "xxavier.dessens@gmail.com"}
                  required
                  type="email"
                  value={email}
                />
              </label>
              {emailError && <p className="status-message status-message--error" role="alert">{emailError}</p>}
              <button className="button button--primary" disabled={saving} type="submit">
                {saving ? "Vérification…" : mode === "player" ? "Continuer comme Joueur" : "Se connecter comme Coach"}
              </button>
            </form>

            {mode === "coach" && (
              <>
                <div className="welcome-auth__separator"><span>ou accès de démonstration</span></div>
                <form className="match-form welcome-auth__form" onSubmit={submitCoachDemo}>
                  <label>
                    Code PIN démo
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
                  {demoError && <p className="status-message status-message--error" role="alert">{demoError}</p>}
                  <button className="button button--secondary" disabled={saving} type="submit">
                    Accès Coach Démo
                  </button>
                </form>
              </>
            )}
            <button
              className="welcome-auth__back"
              onClick={() => chooseMode("")}
              type="button"
            >← Retour aux profils</button>
          </>
        )}
        <p className="welcome-auth__note">
          Connexion de démonstration : les emails identifient le profil, sans mot de passe.
        </p>
      </section>
    </div>
  );
}
