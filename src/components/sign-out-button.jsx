import React from "react";
import styles from "../css/chat-room.module.css";

import { auth } from "../app";

export function SignOutButton() {
  return (
    auth.currentUser && (
      <button className={styles["sign-out"]} onClick={() => auth.signOut()}>
        Sign Out
      </button>
    )
  );
}
