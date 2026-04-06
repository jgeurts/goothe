import { Component, StrictMode } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { createRoot } from "react-dom/client";

import App from "@/components/App";

// Stop Goose scripts from running after we take over the page
const gooseScripts = document.querySelectorAll(
  'script:not([type="module"]), script[src*="goose"], script[src*="chunk"]',
);
for (const s of gooseScripts) s.remove();

main();

function main() {
  if (!document.body) {
    setTimeout(main, 100);
    return;
  }

  try {
    console.log("[goothe] main() starting");

    // Clear the existing Goose UI from the page body
    document.body.replaceChildren();

    // Show an immediate loading indicator (inline styles, no CSS dependency)
    const loader = document.createElement("div");
    loader.id = "goothe-loader";
    loader.style.cssText =
      "display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui;color:#5f9ea0;font-size:1rem";
    loader.textContent = "Loading Goothe...";
    document.body.appendChild(loader);

    // Remove host page stylesheets that could conflict (keep our goothe CSS)
    for (const el of document.head.querySelectorAll('link[rel="stylesheet"], style')) {
      if (!el.getAttribute("href")?.includes("goothe")) {
        el.remove();
      }
    }

    document.title = "Bay View Bark";
    addViewportMeta();
    addBlankFavicon();
    addGoogleFont();

    console.log("[goothe] mounting React");
    const container = document.createElement("div");
    document.body.replaceChildren(container);
    createRoot(container).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
    console.log("[goothe] render() called");
  } catch (err) {
    console.error("[goothe] main() caught:", err);
    showFatalError(err);
  }
}

function showFatalError(err: unknown) {
  const msg = err instanceof Error ? err.message + "\n" + err.stack : String(err);
  // Don't wipe the page — just log. ErrorBoundary handles render errors.
  console.error("Goothe:", msg);

  // Only show UI if body is empty (nothing rendered yet)
  if (document.body && document.body.children.length === 0) {
    document.body.innerHTML = `<div style="padding:2rem;font-family:system-ui;max-width:480px;margin:0 auto">
      <h1 style="color:#ef4444;font-size:1.25rem;margin-bottom:1rem">Goothe failed to load</h1>
      <pre style="background:#f8f9fa;padding:1rem;border-radius:0.5rem;overflow-x:auto;font-size:0.75rem;white-space:pre-wrap;word-break:break-word;color:#475569">${msg}</pre>
      <a href="https://booking.goose.pet/bay-view-bark/" style="display:inline-block;margin-top:1rem;color:#5f9ea0;font-weight:600">Back to Bay View Bark</a>
    </div>`;
  }
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Goothe render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: "2rem", fontFamily: "system-ui", maxWidth: 480, margin: "0 auto" }}>
          <h1 style={{ color: "#ef4444", fontSize: "1.25rem", marginBottom: "1rem" }}>
            Something went wrong
          </h1>
          <pre
            style={{
              background: "#f8f9fa",
              padding: "1rem",
              borderRadius: "0.5rem",
              fontSize: "0.75rem",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              color: "#475569",
            }}
          >
            {this.state.error.message}
            {"\n"}
            {this.state.error.stack}
          </pre>
          <a
            href="https://booking.goose.pet/bay-view-bark/"
            style={{
              display: "inline-block",
              marginTop: "1rem",
              color: "#5f9ea0",
              fontWeight: 600,
            }}
          >
            Back to Bay View Bark
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}

function addViewportMeta() {
  const meta = document.createElement("meta");
  meta.name = "viewport";
  meta.content = "width=device-width, initial-scale=1, maximum-scale=1";
  document.head.appendChild(meta);
}

function addBlankFavicon() {
  const link = document.createElement("link");
  link.rel = "icon";
  link.href = "data:,";
  document.head.appendChild(link);
}

function addGoogleFont() {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700&display=swap";
  document.head.appendChild(link);
}
