import CloseIcon from "@material-ui/icons/Close";
import { default as React } from "react";
import styles from "../css/chat-room.module.css";

export function AlertDialog(props) {
  return (
    props.alerts.length > 0 && (
      <div className={styles["dialog"] + " " + styles["error-dialog"]}>
        <header>
          <span></span>
          <CloseIcon
            onClick={() => {
              props.requestClose();
            }}
          />
        </header>
        <main>
          {props.alerts.map((alert, i) => (
            <div key={i} className={styles["alert"]}>
              {alert}
            </div>
          ))}
        </main>
        <footer></footer>
      </div>
    )
  );
}
