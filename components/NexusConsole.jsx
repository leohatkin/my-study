"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const API_ENDPOINT = "https://image.pollinations.ai/prompt/";
const MAX_GALLERY_ITEMS = 16;

function clampDimension(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(2048, Math.max(256, parsed));
}

function createImageUrl(prompt, width, height) {
  const seed = Math.floor(Math.random() * 1_000_000_000);
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    nologo: "true",
    private: "true",
    seed: String(seed),
  });

  return `${API_ENDPOINT}${encodeURIComponent(`high quality ${prompt}`)}?${params}`;
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 5 14 14M19 5 5 19" />
    </svg>
  );
}

export default function NexusConsole({ variant }) {
  const isMatrix = variant === "matrix";
  const defaultStatus = isMatrix ? "LIVE_FEED_SYNC" : "SIGNAL: READY";
  const [prompt, setPrompt] = useState("");
  const [width, setWidth] = useState("1280");
  const [height, setHeight] = useState("720");
  const [activeImage, setActiveImage] = useState(null);
  const [caption, setCaption] = useState(
    isMatrix ? "READY FOR INTERCEPT..." : "SYSTEM_READY",
  );
  const [gallery, setGallery] = useState([]);
  const [status, setStatus] = useState(defaultStatus);
  const [phase, setPhase] = useState("idle");
  const [lightbox, setLightbox] = useState(null);
  const overrideRef = useRef(false);
  const imageRequestRef = useRef(0);
  const overrideTimerRef = useRef();

  const showImage = useCallback((item) => {
    const requestId = imageRequestRef.current + 1;
    imageRequestRef.current = requestId;
    setPhase("loading");
    setCaption("DECODING IMAGE SIGNAL...");

    const loader = new Image();
    loader.onload = () => {
      if (imageRequestRef.current !== requestId) return;
      setActiveImage(item);
      setCaption(item.prompt);
      setPhase("ready");
    };
    loader.onerror = () => {
      if (imageRequestRef.current !== requestId) return;
      setCaption("SIGNAL LOST — TRY ANOTHER DIRECTIVE");
      setStatus("SIGNAL: IMAGE_ERROR");
      setPhase("error");
    };
    loader.src = item.url;
  }, []);

  const generate = useCallback(
    (event) => {
      event?.preventDefault();
      const cleanPrompt = prompt.trim();
      if (!cleanPrompt || phase === "loading") return;

      const safeWidth = clampDimension(width, 1280);
      const safeHeight = clampDimension(height, 720);
      const item = {
        id: `${Date.now()}-${Math.random()}`,
        prompt: cleanPrompt,
        url: createImageUrl(cleanPrompt, safeWidth, safeHeight),
      };

      overrideRef.current = true;
      setStatus(isMatrix ? "OVERRIDE_ACTIVE" : "SIGNAL: GENERATING");
      setWidth(String(safeWidth));
      setHeight(String(safeHeight));
      setPrompt("");
      setGallery((current) => [item, ...current].slice(0, MAX_GALLERY_ITEMS));
      showImage(item);

      window.clearTimeout(overrideTimerRef.current);
      overrideTimerRef.current = window.setTimeout(() => {
        overrideRef.current = false;
        setStatus(defaultStatus);
      }, 12000);
    }, [defaultStatus, height, isMatrix, phase, prompt, showImage, width],
  );

  useEffect(() => {
    if (!isMatrix) return undefined;

    let source;
    let retryTimer;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      source = new EventSource("https://image.pollinations.ai/feed");
      source.onopen = () => {
        if (!overrideRef.current) setStatus(defaultStatus);
      };
      source.onmessage = (event) => {
        if (overrideRef.current) return;
        try {
          const data = JSON.parse(event.data);
          if (data.imageURL) {
            showImage({
              id: `feed-${Date.now()}`,
              url: data.imageURL,
              prompt: data.prompt || "UNTITLED SIGNAL",
            });
          }
        } catch {
          setCaption("RECEIVED UNREADABLE SIGNAL PACKET");
        }
      };
      source.onerror = () => {
        source?.close();
        if (!overrideRef.current) {
          setStatus("RECONNECTING_LINK");
          setCaption("RE-ESTABLISHING LINK MODULE...");
        }
        retryTimer = window.setTimeout(connect, 5000);
      };
    };

    connect();
    return () => {
      cancelled = true;
      source?.close();
      window.clearTimeout(retryTimer);
    };
  }, [defaultStatus, isMatrix, showImage]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  useEffect(() => () => window.clearTimeout(overrideTimerRef.current), []);

  return (
    <div className={`nexus-shell ${isMatrix ? "theme-matrix" : "theme-terminal"}`}>
      <div className="ambient-grid" aria-hidden="true" />

      <header className="topbar">
        <div className="status-cluster">
          <span className={`status-dot ${phase}`} />
          <span className="status-label">{status}</span>
        </div>
        <nav className="route-switcher" aria-label="Display mode">
          <Link className={!isMatrix ? "active" : ""} href="/">
            Studio
          </Link>
          <span aria-hidden="true">/</span>
          <Link className={isMatrix ? "active" : ""} href="/buzzfeed">
            Live feed
          </Link>
        </nav>
        <div className="mode-label">
          {isMatrix ? "NEXUS // SYSTEM_OS" : "NEXUS_v17_BRIDGE"}
        </div>
      </header>

      <main className="workspace">
        <section className="screen-unit" aria-label="Image signal console">
          <div className={`monitor ${phase}`}>
            <div className="corner corner-tl" />
            <div className="corner corner-tr" />
            <div className="corner corner-bl" />
            <div className="corner corner-br" />

            {activeImage ? (
              <img
                className="display-image"
                src={activeImage.url}
                alt={activeImage.prompt}
              />
            ) : (
              <div className="empty-monitor">
                <div className="reticle" aria-hidden="true">
                  <span />
                </div>
                <p>{isMatrix ? "AWAITING LIVE SIGNAL" : "NO SIGNAL SELECTED"}</p>
                <span>
                  {isMatrix
                    ? "The public feed connects automatically"
                    : "Enter a directive to synthesize an image"}
                </span>
              </div>
            )}

            {phase === "loading" && (
              <div className="signal-loader" aria-label="Loading image">
                <span>ACQUIRING SIGNAL</span>
              </div>
            )}
            {!isMatrix && <div className="scanline" aria-hidden="true" />}
            <div className="monitor-meta" aria-hidden="true">
              <span>CH. 17</span>
              <span>{width} × {height}</span>
            </div>
          </div>

          <div className="caption-strip">
            <span className="caption-index">// 001</span>
            <p title={caption}>{caption}</p>
            <span className="caption-mark">NXS</span>
          </div>

          <form className="console-panel" onSubmit={generate}>
            <label className="prompt-field">
              <span className="field-prefix">&gt;</span>
              <span className="sr-only">Image directive</span>
              <input
                autoComplete="off"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={isMatrix ? "Enter generation directive..." : "Create a transmission..."}
              />
            </label>
            <label className="dimension-field">
              <span>W</span>
              <input
                inputMode="numeric"
                value={width}
                onChange={(event) => setWidth(event.target.value)}
                aria-label="Image width"
              />
            </label>
            <label className="dimension-field">
              <span>H</span>
              <input
                inputMode="numeric"
                value={height}
                onChange={(event) => setHeight(event.target.value)}
                aria-label="Image height"
              />
            </label>
            <button type="submit" disabled={!prompt.trim() || phase === "loading"}>
              <span>{phase === "loading" ? "Working" : isMatrix ? "Execute" : "Create"}</span>
              <span className="button-arrow" aria-hidden="true">↗</span>
            </button>
          </form>
        </section>
      </main>

      <footer className={`gallery-rail ${gallery.length ? "populated" : ""}`}>
        <div className="gallery-heading">
          <span>Recent captures</span>
          <small>{String(gallery.length).padStart(2, "0")} / {MAX_GALLERY_ITEMS}</small>
        </div>
        <div className="gallery-items">
          {gallery.length === 0 ? (
            <p className="gallery-empty">Generated signals collect here</p>
          ) : (
            gallery.map((item, index) => (
              <article
                className={`thumbnail ${activeImage?.id === item.id ? "selected" : ""}`}
                key={item.id}
              >
                <button
                  className="thumbnail-select"
                  type="button"
                  onClick={() => showImage(item)}
                  aria-label={`Display ${item.prompt}`}
                >
                  <img src={item.url} alt="" />
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </button>
                <button
                  className="thumbnail-expand"
                  type="button"
                  onClick={() => setLightbox(item)}
                  aria-label={`Expand ${item.prompt}`}
                >
                  <ExpandIcon />
                </button>
              </article>
            ))
          )}
        </div>
      </footer>

      {lightbox && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Expanded image">
          <button type="button" className="lightbox-backdrop" onClick={() => setLightbox(null)} aria-label="Close expanded image" />
          <figure>
            <img src={lightbox.url} alt={lightbox.prompt} />
            <figcaption>{lightbox.prompt}</figcaption>
          </figure>
          <button className="lightbox-close" type="button" onClick={() => setLightbox(null)} aria-label="Close expanded image">
            <CloseIcon />
          </button>
        </div>
      )}
    </div>
  );
}
