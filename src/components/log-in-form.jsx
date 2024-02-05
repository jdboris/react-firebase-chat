import { Close as CloseIcon } from "@mui/icons-material";
import firebase from "firebase/compat/app";
import React, { useState } from "react";
import styles from "../css/chat-room.module.css";
import { CustomError } from "../utils/errors";
import { setQueryParam, timeout } from "../utils/utils";
import { auth } from "./chat-room-app";

export function LogInForm(props) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(props.email ? props.email : "");
  const [password, setPassword] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [passwordResetLink, setPasswordResetLink] = useState("");
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  if (props.open) {
    const url = new URL(window.location);

    // Force a logout to refresh the token
    if (url.searchParams.get("chat-reset-password") && !passwordResetLink) {
      const link = decodeURIComponent(
        url.searchParams.get("chat-reset-password")
      );

      setPasswordResetLink(link);

      props.logout();
    }
  }

  return props.open ? (
    <form
      className={styles["login-form"] + " " + styles["dialog"]}
      onSubmit={(e) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        setErrors([]);

        // NOTE: Do not call setLoading(false) after the timeout because the component will have unmounted by then
        timeout(10000, async () => {
          // try {
          if (passwordResetLink) {
            if (password.length < 8) {
              throw new CustomError("Password must be 8+ characters.");
            }
            const oldLink = new URL(passwordResetLink);

            let link = new URL(
              process.env.REACT_APP_FIREBASE_PASSWORD_RESET_URL
            );
            link.searchParams.set("key", process.env.REACT_APP_API_KEY);

            const response = await fetch(link, {
              method: "POST",
              body: JSON.stringify({
                oobCode: oldLink.searchParams.get("oobCode"),
                newPassword: password,
              }),
            });
            if (!response.ok) {
              setQueryParam("chat-reset-password", null);
              setPasswordResetLink("");
              throw new CustomError(
                "Password reset request expired. Please initiate a new reset request."
              );
            }
            const data = await response.json();
            setEmail(data.email);

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
              throw new CustomError(
                result.data.error.message,
                result.data.error
              );
            } else {
              props.setAlerts([result.data.message]);
            }

            setLoading(false);
            return;
          }

          if (!email) {
            throw new CustomError("Please enter your email address.");
          }

          if (!password) {
            throw new CustomError("Please enter a password.");
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
              throw new CustomError(
                result.data.error.message,
                result.data.error
              );
            }

            props.setAlerts([
              "Signup complete! Check your inbox to complete your email verification.",
            ]);
          }

          // NOTE: Must must .catch instead of catch block because of auth bug (https://github.com/firebase/firebase-js-sdk/issues/2101)
          await auth
            .signInWithEmailAndPassword(email, password)
            .catch((error) => {
              throw new CustomError(error.message, error);
            })
            .finally(() => {
              setLoading(false);
              setPassword("");
            });

          props.requestClose();
          // } catch (error) {
          //   setErrors([new CustomError(error.message, error)]);
          //   setLoading(false);
          // }
        }).catch((error) => {
          setErrors([new CustomError(error.message, error)]);
          setLoading(false);
        });
      }}
    >
      <header>
        {isNewUser ? "Signup" : "Login"}
        <CloseIcon
          onClick={() => {
            setUsername("");
            setEmail("");
            setPassword("");
            setIsNewUser(false);
            setForgotPassword(false);
            setPasswordResetLink("");
            setErrors([]);
            setLoading(false);
            props.requestClose();
          }}
        />
      </header>
      <fieldset disabled={loading}>
        {errors.map((error, i) => (
          <div key={i} className={styles["error"]}>
            {error.message}
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
              autoComplete="email"
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
                  throw new CustomError(
                    result.data.error.message,
                    result.data.error
                  );
                }

                await auth
                  .signInWithCustomToken(result.data.token)
                  .catch((error) => {
                    throw new CustomError(
                      "Something went wrong. Please try again."
                    );
                  });

                firebase.app().functions().httpsCallable("validateUser")();

                props.requestClose();
              })
                .catch((error) => {
                  setErrors([new CustomError(error.message, error)]);
                })
                .finally(() => {
                  setLoading(false);
                });
            }}
          >
            Chat Anonymously
          </button>
        )}
      </fieldset>
    </form>
  ) : (
    <></>
  );
}
