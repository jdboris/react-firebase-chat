import React, { useState } from "react";
import styles from "../css/chat-room.module.css";

import firebase from "firebase/app";

import { auth } from "../app";

export function SignInForm() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);

  return (
    <form
      className={styles["login-form"]}
      onSubmit={(e) => {
        e.preventDefault();
        if (isNewUser) {
          let signUp = firebase.functions().httpsCallable("signUp");
          signUp({ email: email, password: password, username: username }).then(
            (result) => {
              if (result.data.success) {
                auth.signInWithEmailAndPassword(email, password);
              }
            }
          );
        } else {
          auth.signInWithEmailAndPassword(email, password);
        }
      }}
    >
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
          <button>Sign Up</button>
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
          <button>Sign In</button>
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

      <button
        className={styles["sign-in"]}
        onClick={() => {
          auth.signInAnonymously();
        }}
      >
        Chat Anonymously
      </button>
    </form>
  );
}
