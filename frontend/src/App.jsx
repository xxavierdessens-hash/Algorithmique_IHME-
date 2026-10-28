import { useEffect, useState } from "react";
import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import { api } from "./api/client.js";
import TrainingDetailModal from "./components/TrainingDetailModal.jsx";
import WelcomeAuthModal from "./components/WelcomeAuthModal.jsx";
import CalendarPage from "./pages/CalendarPage.jsx";
import GlobalCalendarPage from "./pages/GlobalCalendarPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import LiveMatchPage from "./pages/LiveMatchPage.jsx";
import MatchSummaryPage from "./pages/MatchSummaryPage.jsx";
import PlayerProgressPage from "./pages/PlayerProgressPage.jsx";
import PlayersPage from "./pages/PlayersPage.jsx";
import TrainingsPage from "./pages/TrainingsPage.jsx";

const NAV_ITEMS = [
  { id: "matches", label: "Matchs", path: "/matchs" },
  { id: "trainings", label: "Entraînements", path: "/entrainements" },
  { id: "progress", label: "Progression", path: "/progression" },
  { id: "players", label: "Équipe", path: "/effectif" },
];

function pageFromPath(pathname) {
  if (pathname === "/live") return "live";
  if (pathname === "/recap") return "summary";
  if (pathname === "/calendrier") return "calendar";
  return NAV_ITEMS.find((item) => item.path === pathname)?.id || "home";
}

function readProfileSession() {
  try {
    const stored = JSON.parse(window.localStorage.getItem("statsvolley-profile"));
    if (
      stored &&
      ["Coach", "Joueur", "Invité"].includes(stored.role) &&
      typeof stored.name === "string" &&
      typeof stored.email === "string" &&
      (stored.role === "Invité" || (
        stored.id !== null &&
        stored.id !== undefined &&
        typeof stored.accessToken === "string"
      ))
    ) {
      return stored;
    }
  } catch {
    return null;
  }
  return null;
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [page, setPage] = useState(() => pageFromPath(location.pathname));
  const [matches, setMatches] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [players, setPlayers] = useState([]);
  const [profileSession, setProfileSession] = useState(readProfileSession);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState("login");
  const profile = profileSession?.role ?? null;
  const playerId = profile === "Joueur" ? profileSession.playerId : "";
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState("");
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [trainingLoadError, setTrainingLoadError] = useState("");

  useEffect(() => {
    setPage(pageFromPath(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    if (profile !== "Coach" && location.pathname === "/live") {
      navigate("/", { replace: true });
    }
  }, [location.pathname, navigate, profile]);

  useEffect(() => {
    if (profileSession) {
      window.localStorage.setItem("statsvolley-profile", JSON.stringify(profileSession));
    } else {
      window.localStorage.removeItem("statsvolley-profile");
    }
  }, [profileSession]);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.getMatches()
        .then((result) => { if (active) setMatches(result); })
        .catch((requestError) => { if (active) setError(requestError.message); }),
      api.getTrainings()
        .then((result) => { if (active) setTrainings(result); })
        .catch((requestError) => {
          if (active) setTrainingLoadError(requestError.message);
        }),
      api.getPlayers()
        .then((result) => { if (active) setPlayers(result); })
        .catch((requestError) => { if (active) setError(requestError.message); }),
    ])
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const attendanceEventKey = [
    ...matches.map((match) => `match:${match.id}`),
    ...trainings.map((training) => `training:${training.id}`),
  ].join("|");

  useEffect(() => {
    let active = true;
    setAttendanceLoading(true);
    api.getAttendance()
      .then((result) => {
        if (active) {
          setAttendance(result);
          setAttendanceError("");
        }
      })
      .catch((requestError) => {
        if (active) setAttendanceError(requestError.message);
      })
      .finally(() => {
        if (active) setAttendanceLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attendanceEventKey]);

  function navigateTo(nextPage) {
    if (nextPage === "live" && profile !== "Coach") {
      setAuthInitialMode("login");
      setAuthModalOpen(true);
      return;
    }
    const item = NAV_ITEMS.find((navItem) => navItem.id === nextPage);
    const path = item?.path ?? (
      nextPage === "home" ? "/" :
        nextPage === "calendar" ? "/calendrier" :
          nextPage === "live" ? "/live" :
            nextPage === "summary" ? "/recap" : null
    );
    if (!path) return;
    if (nextPage === "live" && !selectedMatch) {
      const nextMatch = matches.find((match) => match.status !== "Terminé");
      if (nextMatch) setSelectedMatch(nextMatch);
    }
    if (location.pathname !== path) navigate(path);
    setPage(nextPage);
  }

  function openMatch(match) {
    if (profile !== "Coach") {
      setAuthInitialMode("login");
      setAuthModalOpen(true);
      return;
    }
    setSelectedMatch(match);
    navigateTo("live");
  }

  function openTraining(training) {
    setSelectedTraining(training);
  }

  function logout() {
    window.localStorage.removeItem("statsvolley-profile");
    setProfileSession(null);
    setAuthModalOpen(false);
    setSelectedTraining(null);
    setSelectedMatch(null);
    if (location.pathname === "/live") navigate("/", { replace: true });
  }

  function openSummary(match) {
    setSelectedMatch(match);
    navigateTo("summary");
  }

  async function addMatch(match) {
    const createdMatch = await api.createMatch(match);
    setMatches((current) =>
      [...current, createdMatch].sort(
        (first, second) => new Date(first.match_date) - new Date(second.match_date),
      ),
    );
  }

  async function deleteMatch(matchId) {
    await api.deleteMatch(matchId);
    setMatches((current) =>
      current.filter((match) => String(match.id) !== String(matchId)),
    );
    setSelectedMatch((current) =>
      String(current?.id) === String(matchId) ? null : current,
    );
  }

  async function updateMatch(matchId, changes) {
    const updatedMatch = await api.updateMatch(matchId, changes);
    setMatches((current) =>
      current.map((match) => match.id === updatedMatch.id ? updatedMatch : match),
    );
    setSelectedMatch((current) =>
      current?.id === updatedMatch.id ? updatedMatch : current,
    );
    return updatedMatch;
  }

  async function createTraining(training) {
    const created = await api.createTraining(training);
    setTrainingLoadError("");
    setTrainings((current) => [...current, created]);
    return created;
  }

  async function updateTraining(trainingId, changes) {
    const updated = await api.updateTraining(trainingId, changes);
    setTrainingLoadError("");
    setTrainings((current) =>
      current.map((training) => training.id === updated.id ? updated : training),
    );
    return updated;
  }

  async function deleteTraining(trainingId) {
    await api.deleteTraining(trainingId);
    setTrainingLoadError("");
    setTrainings((current) =>
      current.filter((training) => String(training.id) !== String(trainingId)),
    );
  }

  function updateTrainingDrills(updatedTraining) {
    setTrainings((current) =>
      current.map((training) => training.id === updatedTraining.id
        ? updatedTraining
        : training),
    );
  }

  async function changeAttendance(eventType, eventId, status, selectedPlayerId) {
    setAttendanceSaving(true);
    setAttendanceError("");
    try {
      await api.setAttendance(selectedPlayerId, eventType, eventId, status);
      setAttendance(await api.getAttendance());
    } catch (requestError) {
      setAttendanceError(requestError.message);
    } finally {
      setAttendanceSaving(false);
    }
  }

  const activeNavigationPage = ["live", "summary", "calendar"].includes(page)
    ? "matches"
    : page;

  return (
    <div className="app-shell">
      <div className="demo-banner">
        Démonstration <span aria-hidden="true">·</span> Plateforme de gestion &amp; d’analytics Volleyball
      </div>
      <header className="site-nav">
        <a
          aria-label="StatsVolley, accueil"
          className="site-nav__brand"
          href="/"
          onClick={(event) => { event.preventDefault(); navigateTo("home"); }}
        >
          <span aria-hidden="true">🏐</span> StatsVolley
        </a>
        <nav aria-label="Navigation principale" className="site-nav__links">
          {NAV_ITEMS.map((item) => (
            <button
              aria-current={activeNavigationPage === item.id ? "page" : undefined}
              className={`site-nav__link${activeNavigationPage === item.id ? " site-nav__link--active" : ""}`}
              key={item.id}
              onClick={() => navigateTo(item.id)}
              type="button"
            >{item.label}</button>
          ))}
        </nav>
        <div className="site-nav__account">
          {profileSession ? (
            <>
              <span className="site-nav__profile">
                <span aria-hidden="true" className="site-nav__avatar">
                  {profileSession.name.slice(0, 1).toUpperCase()}
                </span>
                <span>
                  <strong>{profileSession.name}</strong>
                  <small>{profileSession.role}</small>
                </span>
              </span>
              <button className="button button--secondary site-nav__logout" onClick={logout} type="button">
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <button
                className="site-nav__login"
                onClick={() => {
                  setAuthInitialMode("login");
                  setAuthModalOpen(true);
                }}
                type="button"
              >Connexion</button>
              <button
                className="button button--primary"
                onClick={() => {
                  setAuthInitialMode("register");
                  setAuthModalOpen(true);
                }}
                type="button"
              >Créer un compte</button>
            </>
          )}
        </div>
      </header>
      <main className="main-content">
        <div className="page-content">
          {page === "home" && (
            <HomePage
              loading={loading}
              attendance={attendance}
              attendanceError={attendanceError}
              attendanceLoading={attendanceLoading}
              attendanceSaving={attendanceSaving}
              matches={matches}
              onAttendanceChange={changeAttendance}
              onNavigate={navigateTo}
              onOpenTraining={openTraining}
              playerId={playerId}
              profile={profile}
              trainingError={trainingLoadError}
              trainings={trainings}
            />
          )}
          {page === "calendar" && (
            <GlobalCalendarPage
              error={error || trainingLoadError}
              loading={loading}
              matches={matches}
              onOpenMatch={openMatch}
              onOpenSummary={openSummary}
              onOpenTraining={openTraining}
              attendance={attendance}
              attendanceError={attendanceError}
              onAttendanceChange={changeAttendance}
              attendanceSaving={attendanceSaving}
              profile={profile}
              playerId={playerId}
              trainings={trainings}
            />
          )}
          {page === "matches" && (
            <CalendarPage
              matches={matches}
              loading={loading}
              error={error}
              onOpenMatch={openMatch}
              onOpenSummary={openSummary}
              onCreateMatch={addMatch}
              onDeleteMatch={deleteMatch}
              onUpdateMatch={updateMatch}
              attendance={attendance}
              attendanceError={attendanceError}
              onAttendanceChange={changeAttendance}
              attendanceSaving={attendanceSaving}
              playerId={playerId}
              profile={profile}
            />
          )}
          {page === "live" && <LiveMatchPage match={selectedMatch} onUpdateMatch={updateMatch} />}
          {page === "summary" && (
            <MatchSummaryPage
              canManage={profile === "Coach"}
              matches={matches}
              initialMatch={selectedMatch}
            />
          )}
          {page === "players" && <PlayersPage canManage={profile === "Coach"} />}
          {page === "progress" && <PlayerProgressPage />}
          {page === "trainings" && (
            <TrainingsPage
              loadError={trainingLoadError}
              loading={loading}
              onCreateTraining={createTraining}
              onDeleteTraining={deleteTraining}
              onOpenCalendar={() => navigateTo("calendar")}
              onTrainingDrillsUpdated={updateTrainingDrills}
              onUpdateTraining={updateTraining}
              onOpenTraining={openTraining}
              attendance={attendance}
              attendanceError={attendanceError}
              onAttendanceChange={changeAttendance}
              attendanceSaving={attendanceSaving}
              playerId={playerId}
              profile={profile}
              trainings={trainings}
              canManage={profile === "Coach"}
            />
          )}
          {page !== "home" && (
            <footer className="page-footer">STATS VOLLEY <span>·</span> LE JEU EN CHIFFRES</footer>
          )}
        </div>
      </main>
      {selectedTraining && (
        <TrainingDetailModal
          attendance={attendance}
          attendanceError={attendanceError}
          onClose={() => setSelectedTraining(null)}
          onAttendanceChange={changeAttendance}
          playerId={playerId}
          profile={profile}
          attendanceSaving={attendanceSaving}
          training={trainings.find(
            (training) => String(training.id) === String(selectedTraining.id),
          ) || selectedTraining}
        />
      )}
      {authModalOpen && (
        <WelcomeAuthModal
          initialMode={authInitialMode}
          onAuthenticated={(authenticatedProfile) => {
            setProfileSession(authenticatedProfile);
            setAuthModalOpen(false);
          }}
          onClose={() => setAuthModalOpen(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/algorithmique-ihme">
      <AppContent />
    </BrowserRouter>
  );
}
