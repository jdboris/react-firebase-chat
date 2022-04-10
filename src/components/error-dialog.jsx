import { Close as CloseIcon } from "@mui/icons-material";
import { default as React } from "react";
import styles from "../css/chat-room.module.css";

export function ErrorDialog(props) {
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
            <div key={i} className={styles["error"]}>
              {error.message}
            </div>
          ))}
        </main>
        <footer></footer>
      </div>
    )
  );
}
