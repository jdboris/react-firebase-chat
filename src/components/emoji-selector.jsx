import emoji from "emoji-dictionary";
import React from "react";
import styles from "../css/emoji-selector.module.css";

export function EmojiSelector(props) {
  return (
    <div className={styles["emoji-selector"]} shouldcomponentupdate={false}>
      {emoji.unicode.map((emojiChar) => (
        <span
          onClick={() => {
            props.onSelect();
            props.setMessageValue(props.messageValue + emojiChar + " ");
          }}
        >
          {emojiChar}
        </span>
      ))}
    </div>
  );
}
