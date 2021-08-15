import emoji from "emoji-dictionary";
import React from "react";
import { useState } from "react";
import styles from "../css/emoji-selector.module.css";

export function EmojiSelector(props) {
  const [searchValue, setSearchValue] = useState("");

  return (
    <div className={styles["emoji-selector"]}>
      <input
        onInput={(e) => {
          setSearchValue(e.target.value);
        }}
        value={searchValue}
        autoFocus
      />
      <section>
        {emoji.unicode.reduce((accumulator, emojiChar, i) => {
          if (searchValue == "" || emoji.names[i].includes(searchValue)) {
            accumulator.push(
              <span
                title={emoji.names[i]}
                onClick={() => {
                  props.onSelect(emojiChar);
                }}
              >
                {emojiChar}
              </span>
            );
          }

          return accumulator;
        }, [])}
      </section>
    </div>
  );
}
