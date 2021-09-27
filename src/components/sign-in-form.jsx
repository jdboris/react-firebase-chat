import firebase from "firebase/app";
import React, { useState } from "react";
import { auth } from "../app";
import styles from "../css/chat-room.module.css";

export function SignInForm(props) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(props.email);
  const [password, setPassword] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);

  return (
    <form
      className={styles["login-form"]}
      onSubmit={async (e) => {
        e.preventDefault();
        if (isNewUser) {
          const signUp = firebase
            .app()
            .functions("us-central1")
            .httpsCallable("signUp");
          const result = signUp({
            email: email,
            password: password,
            username: username,
          });
          console.log(result);
          if (result.data.success) {
            auth.signInWithEmailAndPassword(email, password);
          }
        } else {
          auth.signInWithEmailAndPassword(email, password);
        }
      }}
    >
      <input
        type="email"
        name="email"
        autoComplete="username"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
        }}
        placeholder="Email"
      />
      {isNewUser ? (
        <input
          id="username"
          autoComplete="username"
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
        id="current-password"
        autoComplete="current-password"
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
          <button
            className={styles["link"]}
            onClick={(e) => {
              e.preventDefault();
              setIsNewUser(false);
            }}
          >
            Existing user?
          </button>
        </>
      ) : (
        <>
          <button>Sign In</button>
          <button
            className={styles["link"]}
            onClick={(e) => {
              e.preventDefault();
              setIsNewUser(true);
            }}
          >
            New user?
          </button>
        </>
      )}

      <button
        className={styles["sign-in"]}
        onClick={(e) => {
          e.preventDefault();
          const signUp = firebase
            .app()
            .functions("us-central1")
            .httpsCallable("signUp");
          signUp({ anonymous: true }).then((result) => {
            if (result.data.success) {
              auth.signInWithCustomToken(result.data.token);
            }
          });
        }}
      >
        Chat Anonymously
      </button>
    </form>
  );
}
