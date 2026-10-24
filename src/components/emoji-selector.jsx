import emoji from "emoji-dictionary";
import React, {
  memo,
  useDeferredValue,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "../css/emoji-selector.module.css";
import { CustomError } from "../utils/errors";

const freeNames = [
    "slightly_smiling_face",
    "neutral_face",
    "slightly_frowning_face",
    "smile",
    "laughing",
    "angry",
    "rage",
    "laughing",
    "stuck_out_tongue_winking_eye",
    "kissing_heart",
    "open_mouth",
    "cry",
    "wink",
    "sunglasses",
    "upside_down_face",
    "vomiting",
    "sleeping",
    "heart",
    "broken_heart",
    "blush",
    "wave",
    "v",
    "shushing",
    "unamused",
    "roll_eyes",
    "hamburger",
    "stop_sign",
    "star",

    // "fire",
    // "100",
    // "peach",
    // "eggplant",
];
const previewNames = [
    "fire",
    "100",
    "thinking",
    "ok_hand",
    "peach",
    "eggplant",
    "ghost",
    "alien",
    "robot",
];

const freeEmojis = freeNames.map((name, id) => ({
  id,
  name,
  char: emoji.getUnicode(name),
}));
const previewEmojis = previewNames.map((name, id) => ({
  id,
  name,
  char: emoji.getUnicode(name),
}));
const premiumEmojis = emoji.unicode.map((char, id) => ({
  id,
  name: emoji.names[id],
  char,
}));
const cellSize = 40;
const viewportHeight = 150;

const EmojiGrid = memo(function EmojiGrid({
  items,
  isAnonymous,
  setErrors,
  onSelect,
}) {
  const gridRef = useRef(null);
  const [columns, setColumns] = useState(1);
  const [scrollRow, setScrollRow] = useState(0);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    const resize = () => {
      setColumns(Math.max(1, Math.floor(grid.clientWidth / cellSize)));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(grid);
    return () => observer.disconnect();
  }, []);

  const rowCount = Math.ceil(items.length / columns);
  const visibleRows = Math.ceil(viewportHeight / cellSize);
  // Keep one extra row on either side without mounting the entire catalog.
  const firstRow = Math.max(0, Math.min(scrollRow, rowCount - visibleRows) - 1);
  const endRow = Math.min(rowCount, firstRow + visibleRows + 3);

  return (
    <section
      ref={gridRef}
      className={styles["emoji-grid"]}
      style={{ height: Math.min(viewportHeight, rowCount * cellSize) }}
      onScroll={(event) => {
        setScrollRow(Math.floor(event.currentTarget.scrollTop / cellSize));
      }}
    >
      <div style={{ height: rowCount * cellSize }}>
        {items.slice(firstRow * columns, endRow * columns).map((item, index) => (
          <span
            key={item.id}
            title={item.name}
            style={{
              top: (firstRow + Math.floor(index / columns)) * cellSize,
              left: `${((index % columns) / columns) * 100}%`,
              width: `${100 / columns}%`,
              height: cellSize,
            }}
            onClick={() => {
              if (isAnonymous)
                return setErrors([
                  new CustomError("Create an account to do that."),
                ]);
              onSelect(item.char);
            }}
          >
            {item.char}
          </span>
        ))}
      </div>
    </section>
  );
});

export function EmojiSelector(props) {
  const [searchValue, setSearchValue] = useState("");
  const query = useDeferredValue(searchValue);
  const items = useMemo(
    () =>
      (props.premium ? premiumEmojis : freeEmojis).filter((item) =>
        item.name.includes(query)
      ),
    [props.premium, query]
  );

  return (
    <div className={styles["emoji-selector"]}>
      <input
        onInput={(e) => {
          setSearchValue(e.target.value);
        }}
        value={searchValue}
        autoFocus
        placeholder="smile, angry, laughing, etc..."
      />
      <EmojiGrid
        key={`${props.premium}-${query}`}
        items={items}
        isAnonymous={props.isAnonymous}
        setErrors={props.setErrors}
        onSelect={props.onSelect}
      />
      {!props.premium && (
        <>
          <section className={styles["preview"]}>
            {previewEmojis
              .filter((item) => item.name.includes(query))
              .map((item) => (
                <span
                  key={item.id}
                  title={item.name}
                  onClick={() => {
                    props.setPremiumPromptOpen(true);
                  }}
                >
                  {item.char}
                </span>
              ))}
          </section>
          <footer>
            Want more emojis?{" "}
            <button
              className={styles["link"]}
              onClick={() => {
                props.setPremiumOpen(true);
              }}
            >
              Upgrade to Premium now!
            </button>
          </footer>
        </>
      )}
    </div>
  );
}
