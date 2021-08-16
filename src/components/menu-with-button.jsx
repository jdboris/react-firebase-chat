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
  }, [props.openKey]);

  return (
    <span style={{ position: "relative" }}>
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
            setKeepOpen(true);
          }}
        >
          {props.items &&
            Object.keys(props.items).map((key) => (
              <div
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
    </span>
  );
}
