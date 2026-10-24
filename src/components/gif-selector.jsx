import { Close as CloseIcon } from "@mui/icons-material";
import { useEffect, useState } from "react";
import poweredByKlipyLogo from "../assets/powered-by-klipy-logo.svg";
import chatStyles from "../css/chat-room.module.css";
import styles from "../css/gif-selector.module.css";
import { registerKlipyShare, searchKlipyGifs } from "../utils/klipy";

export function GifSelector({ apiKey, onSelect, requestClose }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [nextPage, setNextPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [hoveredGifId, setHoveredGifId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    let timeout;
    setLoading(true);
    setError("");
    const timer = setTimeout(async () => {
      try {
        timeout = setTimeout(() => controller.abort(), 10000);
        const data = await searchKlipyGifs({
          apiKey,
          query,
          page,
          signal: controller.signal,
        });
        if (cancelled) return;
        setItems((previous) =>
          page === 1 ? data.items : [...previous, ...data.items],
        );
        setNextPage(data.nextPage);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.name === "AbortError"
              ? "GIF search timed out. Please try again."
              : err.message || "GIF search failed. Please try again.",
          );
        }
      } finally {
        clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
      clearTimeout(timeout);
    };
  }, [apiKey, query, page, retry]);

  return (
    <div
      className={`${chatStyles.dialog} ${styles.picker}`}
      role="dialog"
      aria-label="Search GIFs"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          requestClose();
        }
      }}
    >
      <header>
        GIFs
        <button
          type="button"
          className={styles.closeButton}
          onClick={requestClose}
          aria-label="Close GIF picker"
        >
          <CloseIcon />
        </button>
      </header>
      <input
        type="search"
        aria-label="Search GIFs"
        placeholder="Search KLIPY"
        autoFocus
        maxLength={200}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setPage(1);
          setItems([]);
          setHoveredGifId(null);
          setNextPage(null);
          setLoading(true);
        }}
      />
      <div className={styles.results} aria-busy={loading}>
        <div className={styles.grid}>
          {items.map((gif) => (
            <button
              type="button"
              className={styles.gif}
              key={gif.id}
              title={gif.title}
              aria-label={`Select ${gif.title}`}
              onClick={() => {
                // Reporting must not delay sending the GIF or closing the picker.
                registerKlipyShare({ apiKey, slug: gif.id, query }).catch(
                  () => {},
                );
                onSelect(gif);
              }}
              onMouseEnter={() => {
                setHoveredGifId(gif.id);
              }}
              onMouseLeave={() => setHoveredGifId(null)}
            >
              <img
                src={hoveredGifId === gif.id ? gif.gifUrl : gif.thumbnailUrl}
                alt={gif.description || gif.title}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => {
                  setHoveredGifId((current) =>
                    current === gif.id ? null : current,
                  );
                }}
              />
            </button>
          ))}
          {loading &&
            Array.from({ length: 6 }, (_, index) => (
              <div
                key={`skeleton-${index}`}
                className={styles.skeleton}
                aria-hidden="true"
              />
            ))}
        </div>
        {loading && (
          <span className={styles.loadingStatus} role="status">
            Searching GIFs...
          </span>
        )}
        {!loading && !error && items.length === 0 && (
          <p role="status">No GIFs found. Try another search.</p>
        )}
        {error && (
          <div role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => setRetry(retry + 1)}>
              Retry
            </button>
          </div>
        )}
        {!loading && !error && nextPage !== null && (
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setPage(nextPage);
            }}
          >
            Load more
          </button>
        )}
      </div>
      <footer>
        <a href="https://klipy.com" target="_blank" rel="noopener noreferrer">
          <img
            className={styles.poweredByLogo}
            src={poweredByKlipyLogo}
            alt="Powered by Klipy"
          />
        </a>
      </footer>
    </div>
  );
}
