import React, { useState } from "react";
import styles from "../css/chat-room.module.css";

import firebase from "firebase/app";

import { auth } from "../app";

export function SignInForm() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);

  const signInWithEmail = () => {
    auth.signInWithEmailAndPassword(email, password);
  };

  const signInAnonymously = () => {
    auth.signInAnonymously();
  };

  const signUp = () => {
    let signUp = firebase.functions().httpsCallable("signUp");
    signUp({ email: email, password: password, username: username }).then(
      (result) => {
        if (result.data.success) {
          auth.signInWithEmailAndPassword(email, password);
        }
      }
    );
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
      {isNewUser ? (
        <input
          type="text"
          name="username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
          }}
          placeholder="Username"
        />
      ) : (
        ""
      )}
      <input
        type="password"
        name="password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
        }}
        placeholder="Password"
      />

      {isNewUser ? (
        <>
          <button className={styles["sign-in"]} onClick={signUp}>
            Sign Up
          </button>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setIsNewUser(false);
            }}
          >
            Existing user?
          </a>
        </>
      ) : (
        <>
          <button className={styles["sign-in"]} onClick={signInWithEmail}>
            Sign In
          </button>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setIsNewUser(true);
            }}
          >
            New user?
          </a>
        </>
      )}

      <button className={styles["sign-in"]} onClick={signInAnonymously}>
        Sign In Anonymously
      </button>

      <p>
        Do not violate the community guidelines or you will be banned for life!
      </p>
    </>
  );
}
