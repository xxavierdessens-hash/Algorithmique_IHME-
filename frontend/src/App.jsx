import { useEffect, useState } from "react";
import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import { api } from "./api/client.js";
import CalendarPage from "./pages/CalendarPage.jsx";
import GlobalCalendarPage from "./pages/GlobalCalendarPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import LiveMatchPage from "./pages/LiveMatchPage.jsx";
import MatchSummaryPage from "./pages/MatchSummaryPage.jsx";
import PlayerProgressPage from "./pages/PlayerProgressPage.jsx";
import PlayersPage from "./pages/PlayersPage.jsx";
import TrainingsPage from "./pages/TrainingsPage.jsx";

const NAV_ITEMS = [
  { id: "home", label: "Accueil", number: "01", path: "/", icon: "⌂" },
  { id: "calendar", label: "Calendrier", number: "02", path: "/calendrier", icon: "◷" },
  { id: "matches", label: "Matchs", number: "03", path: "/matchs", icon: "◎" },
  { id: "trainings", label: "Entraînements", number: "04", path: "/entrainements", icon: "↗" },
  { id: "progress", label: "Progression", number: "05", path: "/progression", icon: "⌁" },
  { id: "players", label: "Effectif", number: "06", path: "/effectif", icon: "◉" },
];

function pageFromPath(pathname) {
  if (pathname === "/live") return "live";
  if (pathname === "/recap") return "summary";
  return NAV_ITEMS.find((item) => item.path === pathname)?.id || "home";
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [page, setPage] = useState(() => pageFromPath(location.pathname));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.localStorage.getItem("statsvolley-sidebar-collapsed") === "true",
  );
  const [matches, setMatches] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [attendance, setAttendance] = useState([]);
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
    const item = NAV_ITEMS.find((navItem) => navItem.id === nextPage);
    const path = item?.path ?? (nextPage === "live" ? "/live" : nextPage === "summary" ? "/recap" : null);
    if (!path) return;
    if (nextPage === "live" && !selectedMatch) {
      const nextMatch = matches.find((match) => match.status !== "Terminé");
      if (nextMatch) setSelectedMatch(nextMatch);
    }
    if (location.pathname !== path) navigate(path);
    setPage(nextPage);
  }

  function openMatch(match) {
    setSelectedMatch(match);
    navigateTo("live");
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

  const activeNavigationPage = page === "live" || page === "summary" ? "matches" : page;

  return (
    <div className={`app-shell${sidebarCollapsed ? " app-shell--sidebar-collapsed" : ""}`}>
      <aside className={`sidebar${sidebarCollapsed ? " sidebar--collapsed" : ""}`}>
        <a className="brand" href="/" onClick={(event) => { event.preventDefault(); navigateTo("home"); }}>
          <span className="brand__mark">SV</span>
          <span>stats<span className="brand__accent">volley</span><small>CLUB DASHBOARD</small></span>
        </a>
        <button
          aria-label={sidebarCollapsed ? "Déplier le menu" : "Rétracter le menu"}
          aria-pressed={sidebarCollapsed}
          className="sidebar__toggle"
          onClick={() => setSidebarCollapsed((current) => {
            const next = !current;
            window.localStorage.setItem("statsvolley-sidebar-collapsed", String(next));
            return next;
          })}
          title={sidebarCollapsed ? "Déplier le menu" : "Rétracter le menu"}
          type="button"
        >{sidebarCollapsed ? "›" : "‹"}</button>
        <div className="sidebar__label">ESPACE ÉQUIPE</div>
        <nav aria-label="Navigation principale">
          {NAV_ITEMS.map((item) => (
            <button
              aria-current={activeNavigationPage === item.id ? "page" : undefined}
              className={`nav-link${activeNavigationPage === item.id ? " nav-link--active" : ""}`}
              key={item.id}
              onClick={() => navigateTo(item.id)}
              title={sidebarCollapsed ? item.label : undefined}
              type="button"
            >
              <span className="nav-link__icon" aria-hidden="true">{item.icon}</span>
              <span className="nav-link__label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar__footer">
          <span className="team-avatar">SV</span>
          <span><strong>StatsVolley</strong><small>Équipe première</small></span>
          <span className="online-dot" aria-label="Connecté" />
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div><span className="topbar__crumb">STATS VOLLEY</span><span className="topbar__divider">/</span> SAISON 2026—2027</div>
          <span className="topbar__status"><i /> Système opérationnel</span>
        </header>
        <div className="page-content">
          {page === "home" && (
            <HomePage
              loading={loading}
              attendance={attendance}
              attendanceError={attendanceError}
              attendanceLoading={attendanceLoading}
              matches={matches}
              onNavigate={navigateTo}
              onOpenMatch={openMatch}
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
              onOpenTrainings={() => navigateTo("trainings")}
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
              onUpdateMatch={updateMatch}
            />
          )}
          {page === "live" && <LiveMatchPage match={selectedMatch} onUpdateMatch={updateMatch} />}
          {page === "summary" && <MatchSummaryPage matches={matches} initialMatch={selectedMatch} />}
          {page === "players" && <PlayersPage />}
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
              trainings={trainings}
            />
          )}
          {page !== "home" && (
            <footer className="page-footer">STATS VOLLEY <span>·</span> LE JEU EN CHIFFRES</footer>
          )}
        </div>
      </main>
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
