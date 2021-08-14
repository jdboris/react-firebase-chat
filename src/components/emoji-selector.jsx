import emoji from "emoji-dictionary";
import React from "react";
import { useState } from "react";
import styles from "../css/emoji-selector.module.css";

export function EmojiSelector(props) {
  const [emojis, setEmojis] = useState(emoji.unicode);

  return (
    <div className={styles["emoji-selector"]}>
      <input
        onInput={(e) => {
          setEmojis(
            emoji.unicode.filter((emojiChar, i) => {
              return emoji.names[i].includes(e.target.value);
            })
          );
        }}
      />
      {emojis.map((emojiChar) => (
        <span
          onClick={() => {
            props.onSelect(emojiChar);
          }}
        >
          {emojiChar}
        </span>
      ))}
    </div>
  );
}
