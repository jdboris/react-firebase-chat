import firebase from "firebase/app";
import React, { useState } from "react";
import { auth } from "../app";
import styles from "../css/chat-room.module.css";
import { translateError } from "../errors";
import { timeout } from "../utils";

export function SignInForm(props) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(props.email);
  const [password, setPassword] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  return (
    <form
      className={styles["login-form"] + " " + styles["login-form"]}
      onSubmit={(e) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        setErrors([]);

        timeout(10000, async () => {
          try {
            if (isNewUser) {
              const signUp = firebase.app().functions().httpsCallable("signUp");
              const result = await signUp({
                email: email,
                password: password,
                username: username,
              });

              if (result.data.error) {
                setErrors([result.data.error]);
                return;
              }
            }

            // NOTE: Must must .catch instead of catch block because of auth bug (https://github.com/firebase/firebase-js-sdk/issues/2101)
            await auth
              .signInWithEmailAndPassword(email, password)
              .catch((error) => {
                setErrors([translateError(error).message]);
              });
          } catch (error) {
            setErrors(["Something went wrong. Please try again."]);
          }
        })
          .then(() => {
            setLoading(false);
          })
          .catch(() => {
            setErrors(["Something went wrong. Please try again."]);
          });
      }}
    >
      <fieldset disabled={loading}>
        {errors.map((error, i) => (
          <div key={i} className={styles["error"]}>
            {error}
          </div>
        ))}

        {loading && <div className={styles["loading-placeholder"]}></div>}
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
                if (loading) return;
                setIsNewUser(false);
                setErrors([]);
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
                if (loading) return;
                setIsNewUser(true);
                setErrors([]);
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
            if (loading) return;
            setLoading(true);
            setErrors([]);

            timeout(10000, async () => {
              const signUp = firebase.app().functions().httpsCallable("signUp");
              const result = await signUp({ anonymous: true });
              if (result.data.error) {
                setErrors([result.data.error]);
                return;
              }
              await auth
                .signInWithCustomToken(result.data.token)
                .catch((error) => {
                  setErrors(["Something went wrong. Please try again."]);
                });
            })
              .then(() => {
                setLoading(false);
              })
              .catch(() => {
                setErrors(["Something went wrong. Please try again."]);
              });
          }}
        >
          Chat Anonymously
        </button>
      </fieldset>
    </form>
  );
}
