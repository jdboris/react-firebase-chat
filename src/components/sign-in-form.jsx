import firebase from "firebase/app";
import React, { useState } from "react";
import { auth } from "../app";
import styles from "../css/chat-room.module.css";
import { translateError } from "../errors";
import { setQueryParam, timeout } from "../utils";

export function SignInForm(props) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(props.email);
  const [password, setPassword] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [passwordResetLink, setPasswordResetLink] = useState("");
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const url = new URL(window.location);

  // Force a logout to refresh the token
  if (url.searchParams.get("chat-reset-password") && !passwordResetLink) {
    const link = decodeURIComponent(
      url.searchParams.get("chat-reset-password")
    );

    setPasswordResetLink(link);

    props.logout();
  }

  return (
    <form
      className={styles["login-form"]}
      onSubmit={(e) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        setErrors([]);

        // NOTE: Do not call setLoading(false) after the timeout because the component will have unmounted by then
        timeout(10000, async () => {
          try {
            if (passwordResetLink) {
              if (password.length < 8) {
                setLoading(false);
                throw new Error("Password must be 8+ characters.");
              }
              let link = new URL(passwordResetLink);
              link.searchParams.set("newPassword", password);

              const response = await fetch(link);
              if (!response.ok) {
                setQueryParam("chat-reset-password", null);
                setPasswordResetLink("");
                throw new Error(
                  "Password reset request expired. Please initiate a new reset request."
                );
              }
              await response.json();

              props.setAlerts(["Password reset successful!"]);
              setQueryParam("chat-reset-password", null);
              setPasswordResetLink("");
              setLoading(false);
              return;
            }

            if (forgotPassword) {
              const sendPasswordResetEmail = firebase
                .app()
                .functions()
                .httpsCallable("sendPasswordResetEmail");
              const result = await sendPasswordResetEmail({
                email: email,
                returnUrl: window.location.href,
              });

              if (result.data.error) {
                throw result.data.error;
              } else {
                props.setAlerts([result.data.message]);
              }

              setLoading(false);
              return;
            }

            if (isNewUser) {
              const signUp = firebase.app().functions().httpsCallable("signUp");
              const result = await signUp({
                email: email,
                password: password,
                username: username,
                returnUrl: window.location.href,
              });

              if (result.data.error) {
                throw result.data.error;
              }
            }

            // NOTE: Must must .catch instead of catch block because of auth bug (https://github.com/firebase/firebase-js-sdk/issues/2101)
            await auth
              .signInWithEmailAndPassword(email, password)
              .catch((error) => {
                setErrors([translateError(error).message]);
                setLoading(false);
              });
          } catch (error) {
            setErrors([translateError(error).message]);
            setLoading(false);
          }
        }).catch(() => {
          setErrors(["Something went wrong. Please try again."]);
          setLoading(false);
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

        {!passwordResetLink && (
          <label
            className={isNewUser ? styles["info-tooltip"] : ""}
            data-text="Email verification will be required."
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
          </label>
        )}

        {!forgotPassword && (
          <>
            {isNewUser && !passwordResetLink && (
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
          </>
        )}

        {passwordResetLink ? (
          <button>Complete Password Reset</button>
        ) : forgotPassword ? (
          <>
            <button>Reset Password</button>
            <button
              className={styles["link"]}
              onClick={(e) => {
                e.preventDefault();
                if (loading) return;
                setErrors([]);
                setForgotPassword(false);
              }}
            >
              Signup/login
            </button>
          </>
        ) : isNewUser ? (
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
            <button
              className={styles["link"]}
              onClick={(e) => {
                e.preventDefault();
                if (loading) return;
                setErrors([]);
                setForgotPassword(true);
              }}
            >
              Forgot your password?
            </button>
          </>
        )}

        {!passwordResetLink && !forgotPassword && (
          <button
            className={styles["sign-in"]}
            onClick={(e) => {
              e.preventDefault();
              if (loading) return;
              setLoading(true);
              setErrors([]);

              timeout(10000, async () => {
                const signUp = firebase
                  .app()
                  .functions()
                  .httpsCallable("signUp");
                const result = await signUp({ anonymous: true });
                if (result.data.error) {
                  setErrors([result.data.error]);
                  setLoading(false);
                  return;
                }
                await auth
                  .signInWithCustomToken(result.data.token)
                  .catch((error) => {
                    setErrors(["Something went wrong. Please try again."]);
                    setLoading(false);
                  });
              }).catch(() => {
                setErrors(["Something went wrong. Please try again."]);
                setLoading(false);
              });
            }}
          >
            Chat Anonymously
          </button>
        )}
      </fieldset>
    </form>
  );
}
