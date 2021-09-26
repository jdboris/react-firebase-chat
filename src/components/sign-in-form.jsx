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
      onSubmit={(e) => {
        e.preventDefault();
        if (isNewUser) {
          const signUp = firebase
            .app()
            .functions("us-central1")
            .httpsCallable("signUp");
          signUp({ email: email, password: password, username: username })
            .then((result) => {
              console.log(result);
              if (result.data.success) {
                auth.signInWithEmailAndPassword(email, password);
              }
            })
            .catch((error) => {
              console.error(error);
            });
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
