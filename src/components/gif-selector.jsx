import { getFunctions, httpsCallable } from "firebase/functions";
import React, { useEffect, useState } from "react";
import chatStyles from "../css/chat-room.module.css";
import styles from "../css/gif-selector.module.css";

export function GifSelector({ onSelect, requestClose }) {
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [nextOffset, setNextOffset] = useState(null);
  const [rankingVersion, setRankingVersion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const timer = setTimeout(async () => {
      try {
        const search = httpsCallable(getFunctions(), "searchGifs");
        const { data } = await search({ query, offset, rankingVersion });
        if (cancelled) return;
        setItems((previous) =>
          offset === 0 ? data.items : [...previous, ...data.items]
        );
        setSponsors(data.sponsors);
        setNextOffset(data.nextOffset);
        if (offset === 0) setRankingVersion(data.rankingVersion || null);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "GIF search failed. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // rankingVersion is a pagination token, not a new search input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, offset, retry]);

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
        <button type="button" onClick={requestClose} aria-label="Close GIF picker">
          Close
        </button>
      </header>
      <input
        type="search"
        aria-label="Search GIFs"
        placeholder="Search gifs.so"
        autoFocus
        maxLength={200}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOffset(0);
          setRankingVersion(null);
          setItems([]);
          setSponsors([]);
          setNextOffset(null);
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
              onClick={() => onSelect(gif)}
            >
              <img
                src={gif.thumbnailUrl}
                alt={gif.description || gif.title}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </button>
          ))}
          {loading && Array.from({ length: 6 }, (_, index) => (
            <div
              key={`skeleton-${index}`}
              className={styles.skeleton}
              aria-hidden="true"
            />
          ))}
        </div>
        {sponsors.map((sponsor) => (
          <a
            className={styles.sponsor}
            key={sponsor.id}
            href={sponsor.url}
            target="_blank"
            rel="sponsored noopener noreferrer"
          >
            <small>Sponsored</small>
            <strong>{sponsor.name}</strong>
            <span>{sponsor.description}</span>
          </a>
        ))}
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
        {!loading && !error && nextOffset !== null && (
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setOffset(nextOffset);
            }}
          >
            Load more
          </button>
        )}
      </div>
      <footer>
        Select a GIF to add it to your message.{" "}
        <a href="https://gifs.so" target="_blank" rel="noopener noreferrer">
          Powered by gifs.so
        </a>
      </footer>
    </div>
  );
}
