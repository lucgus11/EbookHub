import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import type { AppSettings } from "@/types";
import { getLocalFiles } from "@/utils";
import toast from "react-hot-toast";

const DEFAULT_SETTINGS: AppSettings = {
  megaConnected:          false,
  defaultConversionFormat: "kepub",
  autoUploadToMega:       false,
  keepLocalCopy:          true,
  theme:                  "dark",
  language:               "fr",
};

const SETTINGS_KEY = "ebookhub_settings";

function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") };
  } catch { return DEFAULT_SETTINGS; }
}

function saveSettings(s: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [megaEmail, setMegaEmail]   = useState("");
  const [megaPass,  setMegaPass]    = useState("");
  const [testing,   setTesting]     = useState(false);
  const [megaStatus, setMegaStatus] = useState<"idle" | "ok" | "fail">("idle");

  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    if (s.megaEmail) setMegaEmail(s.megaEmail);
  }, []);

  const update = (patch: Partial<AppSettings>) => {
    const ns = { ...settings, ...patch };
    setSettings(ns);
    saveSettings(ns);
  };

  const testMega = async () => {
    setTesting(true);
    setMegaStatus("idle");
    try {
      const res = await fetch("/api/mega/files");
      if (res.ok) {
        setMegaStatus("ok");
        update({ megaConnected: true, megaEmail });
        toast.success("MEGA connecté !");
      } else {
        setMegaStatus("fail");
        update({ megaConnected: false });
        toast.error("Connexion MEGA échouée — vérifiez les variables d'env.");
      }
    } catch {
      setMegaStatus("fail");
      toast.error("Erreur réseau");
    } finally {
      setTesting(false);
    }
  };

  const clearLibrary = () => {
    if (!confirm("Supprimer tous les fichiers de la bibliothèque locale ?")) return;
    localStorage.removeItem("ebookhub_files");
    toast.success("Bibliothèque effacée");
  };

  const exportLibrary = () => {
    const files = getLocalFiles();
    const blob  = new Blob([JSON.stringify(files, null, 2)], { type: "application/json" });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement("a");
    a.href = url; a.download = "ebookhub_library.json";
    a.click(); URL.revokeObjectURL(url);
  };

  const installPWA = () => {
    toast("Sur mobile : Menu → Ajouter à l'écran d'accueil. Sur Chrome desktop : icône ⊕ dans la barre d'adresse.", { icon: "📱", duration: 5000 });
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section style={{ marginBottom: "2rem" }}>
      <h2 style={{
        fontFamily: "var(--font-display)", fontStyle: "italic",
        color: "var(--gold)", fontSize: "1rem",
        borderBottom: "1px solid var(--border)",
        paddingBottom: "0.5rem", marginBottom: "1.25rem",
      }}>
        {title}
      </h2>
      {children}
    </section>
  );

  const Toggle = ({
    label, sub, value, onChange,
  }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) => (
    <label style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      cursor: "pointer", padding: "0.5rem 0",
      borderBottom: "1px solid var(--border)",
    }}>
      <div>
        <div style={{ fontSize: "0.9rem", color: "var(--text)" }}>{label}</div>
        {sub && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>{sub}</div>}
      </div>
      <div
        onClick={() => onChange(!value)}
        style={{
          width: "40px", height: "22px",
          borderRadius: "11px",
          background: value ? "var(--gold)" : "var(--border-2)",
          position: "relative", flexShrink: 0,
          transition: "background 0.2s",
          cursor: "pointer",
        }}
      >
        <div style={{
          position: "absolute",
          top: "3px", left: value ? "21px" : "3px",
          width: "16px", height: "16px",
          borderRadius: "50%",
          background: value ? "#0a0a0f" : "var(--text-muted)",
          transition: "left 0.2s",
        }} />
      </div>
    </label>
  );

  return (
    <Layout title="Réglages" subtitle="Configuration de l'application">
      <div style={{ maxWidth: "560px" }}>

        {/* MEGA */}
        <Section title="☁ Stockage MEGA">
          <div style={{
            padding: "1rem",
            background: "var(--bg-3)",
            border: `1px solid ${megaStatus === "ok" ? "var(--green)" : megaStatus === "fail" ? "var(--red)" : "var(--border)"}`,
            borderRadius: "var(--radius-lg)",
            marginBottom: "1rem",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--text)" }}>Statut MEGA</div>
              <span className={`badge ${megaStatus === "ok" ? "badge-green" : megaStatus === "fail" ? "badge-red" : "badge-dim"}`}>
                {megaStatus === "ok" ? "Connecté" : megaStatus === "fail" ? "Erreur" : "Non testé"}
              </span>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.75rem", lineHeight: 1.6 }}>
              Les identifiants MEGA sont configurés via les <strong style={{ color: "var(--text)" }}>variables d'environnement Vercel</strong> :
              <code style={{ display: "block", marginTop: "0.4rem", fontFamily: "var(--font-mono)", background: "var(--bg)", padding: "0.4rem 0.6rem", borderRadius: "var(--radius)", fontSize: "0.75rem" }}>
                MEGA_EMAIL=votre@email.com{"\n"}MEGA_PASSWORD=votre_mot_de_passe
              </code>
            </p>
            <button className="btn btn-ghost btn-sm" onClick={testMega} disabled={testing}>
              {testing ? "⟳ Test en cours…" : "Tester la connexion"}
            </button>
          </div>

          <Toggle
            label="Upload auto sur MEGA"
            sub="Chaque fichier ajouté est uploadé automatiquement"
            value={settings.autoUploadToMega}
            onChange={v => update({ autoUploadToMega: v })}
          />
          <Toggle
            label="Garder une copie locale"
            sub="Conserver la référence même après upload MEGA"
            value={settings.keepLocalCopy}
            onChange={v => update({ keepLocalCopy: v })}
          />
        </Section>

        {/* Conversion */}
        <Section title="⇄ Conversion">
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontSize: "0.78rem", color: "var(--text-dim)", display: "block", marginBottom: "0.4rem" }}>
              Format de sortie par défaut
            </label>
            <select
              className="input"
              value={settings.defaultConversionFormat}
              onChange={e => update({ defaultConversionFormat: e.target.value as AppSettings["defaultConversionFormat"] })}
              style={{ width: "auto" }}
            >
              {["kepub", "epub", "pdf", "mobi", "azw3"].map(f => (
                <option key={f} value={f}>{f.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </Section>

        {/* PWA */}
        <Section title="📱 Application PWA">
          <p style={{ fontSize: "0.85rem", color: "var(--text-dim)", marginBottom: "1rem", lineHeight: 1.6 }}>
            EbookHub peut être installé comme application native sur votre téléphone ou ordinateur,
            avec un accès hors-ligne à votre bibliothèque locale.
          </p>
          <button className="btn btn-ghost" onClick={installPWA}>
            📱 Installer l'application
          </button>
        </Section>

        {/* Bibliothèque locale */}
        <Section title="◫ Bibliothèque locale">
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button className="btn btn-ghost" onClick={exportLibrary}>
              ↓ Exporter la bibliothèque (JSON)
            </button>
            <button className="btn btn-danger" onClick={clearLibrary}>
              ✕ Effacer la bibliothèque
            </button>
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.75rem" }}>
            Les données sont stockées dans le localStorage de votre navigateur.
          </p>
        </Section>

        {/* About */}
        <Section title="ℹ À propos">
          <div style={{
            padding: "1rem",
            background: "var(--bg-3)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            fontSize: "0.82rem",
            color: "var(--text-dim)",
            lineHeight: 1.8,
          }}>
            <div><strong style={{ color: "var(--text)" }}>EbookHub</strong> v1.0.0</div>
            <div>Stack : Next.js 14 · TypeScript · PWA</div>
            <div>APIs : MEGA, Open Library, Google Books</div>
            <div>Outils : kepubify, pdfCropMargins, pdf-lib, JSZip</div>
            <div style={{ marginTop: "0.5rem" }}>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub →</a>
              {" · "}
              <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">Déployer sur Vercel →</a>
            </div>
          </div>
        </Section>
      </div>
    </Layout>
  );
}
