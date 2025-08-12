// pages/index.jsx
import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDownload(e) {
    e.preventDefault();
    setError("");
    if (!url) return setError("Paste a YouTube video link first.");
    setLoading(true);
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Server error: ${res.status}`);
      }

      // Get filename from content-disposition or fallback
      const cd = res.headers.get("content-disposition") || "";
      let filename = "video.mp4";
      const m = cd.match(/filename\*?=(?:UTF-8'')?["']?([^;"']+)/);
      if (m) filename = decodeURIComponent(m[1]);

      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      setError(err.message || "Download failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <h1 style={{ marginBottom: 8 }}>Paste YouTube link → Download MP4</h1>
        <form onSubmit={handleDownload} style={{ width: "100%" }}>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            style={styles.input}
            disabled={loading}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button style={styles.btn} type="submit" disabled={loading}>
              {loading ? "Preparing..." : "Download MP4"}
            </button>
            <button
              type="button"
              style={{ ...styles.btn, background: "#eee", color: "#111" }}
              onClick={() => {
                setUrl("");
                setError("");
              }}
              disabled={loading}
            >
              Clear
            </button>
          </div>
        </form>
        {error && <p style={{ color: "crimson", marginTop: 12 }}>{error}</p>}
        <p style={{ marginTop: 12, color: "#555", fontSize: 13 }}>
          Tip: only download videos you own or have permission to use.
        </p>
      </div>
    </main>
  );
}

const styles = {
  main: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0f172a",
    color: "#fff",
    padding: 24,
    fontFamily: "Inter, system-ui, sans-serif",
  },
  card: {
    width: 720,
    maxWidth: "95%",
    background: "#0b1220",
    padding: 24,
    borderRadius: 12,
    boxShadow: "0 6px 30px rgba(2,6,23,0.7)",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 8,
    border: "1px solid #233",
    background: "#071124",
    color: "#fff",
    outline: "none",
  },
  btn: {
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    background: "#06b6d4",
    color: "#022",
    fontWeight: 600,
  },
};
