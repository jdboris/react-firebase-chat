import React, { useState } from "react";
import "../app.css";

import firebase from "firebase/app";

import { auth } from "../app";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const signInWithGoogle = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider);
  };

  const signInWithEmail = () => {
    auth.signInWithEmailAndPassword(email, password);
  };

  const signInAnonymously = () => {
    auth.signInAnonymously();
  };

  return (
    <>
      <input
        type="email"
        name="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
        }}
        placeholder="Email"
      />
      <input
        type="password"
        name="password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
        }}
        placeholder="Password"
      />

      <button className="sign-in" onClick={signInWithEmail}>
        Sign In
      </button>

      <button className="sign-in" onClick={signInAnonymously}>
        Sign In Anonymously
      </button>
      <p>
        Do not violate the community guidelines or you will be banned for life!
      </p>
    </>
  );
}
