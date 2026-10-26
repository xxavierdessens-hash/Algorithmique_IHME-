export default function StatusMessage({ error, loading, children }) {
  if (loading) {
    return <p className="status-message">Chargement des données…</p>;
  }

  if (error) {
    return <p className="status-message status-message--error">{error}</p>;
  }

  return children ?? null;
}
