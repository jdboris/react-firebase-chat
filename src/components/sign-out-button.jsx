import React from "react";
import "../app.css";

import { auth } from "../app";

export function SignOutButton() {
  return (
    auth.currentUser && (
      <button className="sign-out" onClick={() => auth.signOut()}>
        Sign Out
      </button>
    )
  );
}
