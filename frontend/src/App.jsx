import { useEffect, useState } from "react";
import { api } from "./api/client.js";
import CalendarPage from "./pages/CalendarPage.jsx";
import LiveMatchPage from "./pages/LiveMatchPage.jsx";
import MatchSummaryPage from "./pages/MatchSummaryPage.jsx";
import PlayerProgressPage from "./pages/PlayerProgressPage.jsx";

const NAV_ITEMS = [
  { id: "calendar", label: "Calendrier", number: "01" },
  { id: "live", label: "Live match", number: "02" },
  { id: "summary", label: "Récap match", number: "03" },
  { id: "progress", label: "Progression", number: "04" },
];

export default function App() {
  const [page, setPage] = useState("calendar");
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.getMatches()
      .then((result) => {
        if (active) setMatches(result);
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

  function openMatch(match) {
    setSelectedMatch(match);
    setPage("live");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setPage("calendar"); }}>
          <span className="brand__mark">SV</span>
          <span>stats<span className="brand__accent">volley</span><small>CLUB DASHBOARD</small></span>
        </a>
        <div className="sidebar__label">ESPACE ÉQUIPE</div>
        <nav aria-label="Navigation principale">
          {NAV_ITEMS.map((item) => (
            <button
              aria-current={page === item.id ? "page" : undefined}
              className={`nav-link${page === item.id ? " nav-link--active" : ""}`}
              key={item.id}
              onClick={() => setPage(item.id)}
              type="button"
            >
              <span>{item.number}</span>{item.label}
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
          <div><span className="topbar__crumb">SAISON 2026—2027</span><span className="topbar__divider">/</span> Équipe première</div>
          <span className="topbar__status"><i /> Système opérationnel</span>
        </header>
        <div className="page-content">
          <div className="welcome">
            <div>
              <p className="eyebrow">LA PERFORMANCE, POINT PAR POINT</p>
              <h1>Bonjour, l'équipe <span>✳</span></h1>
              <p>Chaque échange compte. Retrouvez votre saison au même endroit.</p>
            </div>
            <div className="welcome__ball" aria-hidden="true">◉</div>
          </div>
          {page === "calendar" && (
            <CalendarPage matches={matches} loading={loading} error={error} onOpenMatch={openMatch} />
          )}
          {page === "live" && <LiveMatchPage match={selectedMatch} />}
          {page === "summary" && <MatchSummaryPage matches={matches} initialMatch={selectedMatch} />}
          {page === "progress" && <PlayerProgressPage />}
          <footer className="page-footer">STATS VOLLEY <span>·</span> LE JEU EN CHIFFRES</footer>
        </div>
      </main>
    </div>
  );
}
