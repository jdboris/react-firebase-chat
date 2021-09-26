import emoji from "emoji-dictionary";
import React, { useState } from "react";
import styles from "../css/emoji-selector.module.css";

export function EmojiSelector(props) {
  const [searchValue, setSearchValue] = useState("");
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
    "kssing_heart",
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

  const freeCodes = freeNames.map((name) => {
    return emoji.getUnicode(name);
  });

  const previewCodes = previewNames.map((name) => {
    return emoji.getUnicode(name);
  });

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
      <section>
        {(props.premium ? emoji.unicode : freeCodes).reduce(
          (accumulator, emojiChar, i) => {
            if (
              searchValue === "" ||
              (props.premium ? emoji.names : freeNames)[i].includes(searchValue)
            ) {
              accumulator.push(
                <span
                  key={"emoji-" + i}
                  title={(props.premium ? emoji.names : freeNames)[i]}
                  onClick={() => {
                    props.onSelect(emojiChar);
                  }}
                >
                  {emojiChar}
                </span>
              );
            }

            return accumulator;
          },
          []
        )}
      </section>
      {!props.premium && (
        <>
          <section className={styles["preview"]}>
            {previewCodes.reduce((accumulator, emojiChar, i) => {
              if (searchValue === "" || previewNames[i].includes(searchValue)) {
                accumulator.push(
                  <span
                    key={"emoji-preview-" + i}
                    title={previewNames[i]}
                    onClick={() => {
                      props.setPremiumPromptOpen(true);
                    }}
                  >
                    {emojiChar}
                  </span>
                );
              }

              return accumulator;
            }, [])}
          </section>
          <footer>
            Want more emojis?
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
