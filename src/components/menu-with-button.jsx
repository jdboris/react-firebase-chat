import React, { useEffect, useState } from "react";
import styles from "../css/chat-room.module.css";

export function MenuWithButton(props) {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [keepOpen, setKeepOpen] = useState(false);

  useEffect(() => {
    if (!keepOpen) {
      setMenuOpen(false);
    } else {
      setKeepOpen(false);
      setMenuOpen(true);
    }
    // NOTE: Must NOT list keepOpen as a dependent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.openKey]);

  return (
    <button className={styles["alt-button"]} style={{ position: "relative" }}>
      <span
        className={styles["pointer"]}
        onClickCapture={() => {
          if (!isMenuOpen) {
            setKeepOpen(true);
          }
        }}
      >
        {props.button}
      </span>

      {isMenuOpen && (
        <div
          className={styles["menu"]}
          onClickCapture={(e) => {
            // NOTE: Required to prevent auto closing when clicking contents
            if (props.keepOpen) {
              setKeepOpen(true);
            }
          }}
        >
          {props.items &&
            Object.keys(props.items).map((key, i) => (
              <div
                key={i}
                onClickCapture={() => {
                  props.items[key]();
                }}
              >
                {key}
              </div>
            ))}
          {props.children}
        </div>
      )}
    </button>
  );
}
