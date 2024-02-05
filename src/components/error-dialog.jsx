import { Close as CloseIcon } from "@mui/icons-material";
import { default as React } from "react";
import styles from "../css/chat-room.module.css";

export function ErrorDialog(props) {
  for (const error of props.errors) {
    if (error.duration) {
      setTimeout(() => {
        props.requestClose();
      }, error.duration);
    }
  }

  return (
    props.errors.length > 0 && (
      <div className={styles["dialog"] + " " + styles["error-dialog"]}>
        <header>
          Error:
          <CloseIcon
            onClick={() => {
              props.requestClose();
            }}
          />
        </header>
        <main>
          {props.errors.map((error, i) => (
            <div
              key={`error-dialog-error-message-${i}`}
              className={styles["error"]}
            >
              {error.message}
            </div>
          ))}
        </main>
        <footer></footer>
      </div>
    )
  );
}
