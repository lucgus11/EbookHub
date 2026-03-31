export default function Offline() {
  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--bg)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-body)",
      color: "var(--text)",
      padding: "2rem",
      textAlign: "center",
    }}>
      <div style={{ fontSize: "4rem", marginBottom: "1.5rem" }}>📚</div>
      <h1 style={{
        fontFamily: "var(--font-display)",
        fontStyle: "italic",
        fontSize: "2rem",
        color: "var(--cream)",
        marginBottom: "0.75rem",
      }}>
        Hors-ligne
      </h1>
      <p style={{ color: "var(--text-dim)", maxWidth: "360px", lineHeight: 1.6, marginBottom: "2rem" }}>
        Vous êtes hors-ligne. Votre bibliothèque locale reste accessible.
        Les fonctions d'upload et de conversion nécessitent une connexion.
      </p>
      <a href="/" style={{
        padding: "0.6rem 1.5rem",
        background: "var(--gold)",
        color: "#0a0a0f",
        borderRadius: "var(--radius)",
        textDecoration: "none",
        fontWeight: 500,
        fontSize: "0.9rem",
      }}>
        ← Retour à la bibliothèque
      </a>
    </div>
  );
}
