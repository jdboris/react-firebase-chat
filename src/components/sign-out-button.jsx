import React from "react";
import { auth } from "../app";
import styles from "../css/chat-room.module.css";

export function SignOutButton() {
  return (
    auth.currentUser && (
      <button className={styles["sign-out"]} onClick={() => auth.signOut()}>
        Sign Out
      </button>
    )
  );
}
