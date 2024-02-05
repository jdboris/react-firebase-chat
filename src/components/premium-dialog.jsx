import {
  Add as AddIcon,
  Close as CloseIcon,
  DoDisturb as DoDisturbIcon,
} from "@mui/icons-material";
import { default as React, useState } from "react";
import { useCollectionData } from "react-firebase-hooks/firestore";
import styles from "../css/chat-room.module.css";
import { CustomError } from "../utils/errors";
import { sendToCustomerPortal, sendToStripe } from "../utils/stripe";
import { timeout } from "../utils/utils";
import { firestore } from "./chat-room-app";

export function PremiumDialog(props) {
  const { isAnonymous, user } = props;
  const [period, setPeriod] = useState(3);
  const [isGifting, setIsGifting] = useState(false);
  const [recipients, setRecipients] = useState([""]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const query = firestore
    .collection("users")
    .doc(user.uid)
    .collection("subscriptions")
    .where("status", "==", "active")
    .where("role", "==", "premium");

  const [normalSubscriptions] = useCollectionData(query);
  const subscriptions = [
    ...(normalSubscriptions ? normalSubscriptions : []),
    ...(user.giftedPremiumEnd && user.giftedPremiumEnd.toDate() > new Date()
      ? [
          {
            current_period_start: user.giftedPremiumStart,
            current_period_end: user.giftedPremiumEnd,
          },
        ]
      : []),
  ];

  return (
    props.open && (
      <div className={styles["dialog"] + " " + styles["premium-dialog"]}>
        <header>
          Premium
          <CloseIcon
            onClick={() => {
              setIsGifting(false);
              props.requestClose();
            }}
          />
        </header>
        <main>
          {subscriptions && subscriptions.length && !isGifting ? (
            <>
              {subscriptions.map((subscription, i) => {
                const expiration = subscription.current_period_end.toDate();

                const formatter = new Intl.DateTimeFormat(undefined, {
                  timeStyle: "short",
                  dateStyle: "medium",
                });

                return (
                  <span key={i}>
                    Your subscription expires {formatter.format(expiration)}
                  </span>
                );
              })}

              <div>
                {normalSubscriptions.length > 0 && (
                  <button
                    className={loading ? styles["loading"] : ""}
                    onClick={(e) => {
                      e.preventDefault();
                      if (loading) return;
                      setLoading(true);
                      timeout(5000, () => {
                        return sendToCustomerPortal().then(() => {
                          // Add another delay for the navigation to commence/complete
                          setTimeout(() => {
                            setLoading(false);
                          }, 2000);
                        });
                      });
                    }}
                  >
                    Manage Subscription
                  </button>
                )}

                <button
                  className={loading ? styles["loading"] : ""}
                  onClick={(e) => {
                    e.preventDefault();
                    setIsGifting(true);
                  }}
                >
                  Gift to Friends
                </button>
              </div>
            </>
          ) : isAnonymous ? (
            <>Must create an account to upgrade to Premium.</>
          ) : (
            <>
              {isGifting ? (
                <p>
                  Gift a period of Premium to your friend(s). <br />
                  <small>
                    This will extend their current subscription (if applicable).
                  </small>
                </p>
              ) : (
                <p>
                  Upgrade to a Premium account for perks like more emojis, more
                  message style options, and more...
                </p>
              )}

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (loading) return;

                  try {
                    const recipientUids = [];
                    const errors = [];

                    if (isGifting) {
                      for (let i = 0; i < recipients.length; i++) {
                        // If there are duplicates
                        if (
                          recipients.filter((name) => name == recipients[i])
                            .length > 1
                        ) {
                          errors.push(
                            new CustomError("Duplicate user.", { field: i })
                          );
                          break;
                        }

                        const snapshot = await firestore
                          .collection("users")
                          .where(
                            "lowercaseUsername",
                            "==",
                            recipients[i].toLowerCase()
                          )
                          .get();
                        if (!snapshot.docs.length) {
                          errors.push(
                            new CustomError("User not found.", { field: i })
                          );
                        } else if (snapshot.docs[0].id === user.uid) {
                          errors.push(
                            new CustomError("May not gift to yourself.", {
                              field: i,
                            })
                          );
                        } else if ("anonSuffix" in snapshot.docs[0].data()) {
                          errors.push(
                            new CustomError("May not gift to anons.", {
                              field: i,
                            })
                          );
                        } else {
                          recipientUids.push(snapshot.docs[0].id);
                        }
                      }
                    }

                    if (errors.length) throw errors;

                    setLoading(true);

                    await timeout(5 * 60000, async () => {
                      await sendToStripe(
                        user.uid,
                        e.target.period.value,
                        !isGifting,
                        isGifting ? { recipients: recipientUids } : null
                      );
                    });
                  } catch (e) {
                    setErrors(Array.isArray(e) ? e : [e]);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <fieldset disabled={loading}>
                  <label>
                    <input
                      type="radio"
                      name="period"
                      value={
                        isGifting
                          ? process.env.REACT_APP_STRIPE_GIFT_3_MONTHS_PRICE_ID
                          : process.env.REACT_APP_STRIPE_3_MONTH_PRICE_ID
                      }
                      onChange={() => setPeriod(3)}
                      defaultChecked
                    />{" "}
                    3 Months - $2/month
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="period"
                      value={
                        isGifting
                          ? process.env.REACT_APP_STRIPE_GIFT_6_MONTHS_PRICE_ID
                          : process.env.REACT_APP_STRIPE_6_MONTH_PRICE_ID
                      }
                      onChange={() => setPeriod(6)}
                    />{" "}
                    6 Months - $1.5/month
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="period"
                      value={
                        isGifting
                          ? process.env.REACT_APP_STRIPE_GIFT_12_MONTHS_PRICE_ID
                          : process.env.REACT_APP_STRIPE_12_MONTH_PRICE_ID
                      }
                      onChange={() => setPeriod(12)}
                    />{" "}
                    12 Months - $1/month
                  </label>
                  {!isGifting ? (
                    <p>Billed every {period} months. Cancel any time.</p>
                  ) : (
                    <section>
                      Recipient(s)
                      <span className={styles.errors}>
                        {errors
                          .filter((error) => !("field" in error))
                          .map((error) => (
                            <span>{error.message}</span>
                          ))}
                      </span>
                      <ul>
                        {recipients.map((recipient, i) => (
                          <li key={i}>
                            {errors
                              .filter((error) => error.field === i)
                              .map((error) => (
                                <span className={styles["error"]}>
                                  {error.message}
                                </span>
                              ))}
                            <label>
                              {i > 0 && (
                                <DoDisturbIcon
                                  className={styles["pointer"]}
                                  onClick={() => {
                                    setErrors([]);

                                    setRecipients((oldRecipients) => {
                                      oldRecipients.splice(i, 1);
                                      return [...oldRecipients];
                                    });
                                  }}
                                />
                              )}
                              <input
                                autoFocus={i === recipients.length - 1}
                                className={
                                  errors.find((error) => error.field === i)
                                    ? styles["error-highlight"]
                                    : ""
                                }
                                type="text"
                                placeholder="username"
                                value={recipient}
                                onChange={(e) => {
                                  setErrors([]);

                                  setRecipients((oldRecipients) => {
                                    oldRecipients[i] = e.target.value;
                                    if (!oldRecipients[i]) {
                                      oldRecipients.splice(i, 1);
                                    }

                                    return [...oldRecipients];
                                  });
                                }}
                                onKeyPress={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    if (loading) return;
                                    setRecipients((oldRecipients) => {
                                      oldRecipients.push("");

                                      return [...oldRecipients];
                                    });
                                  }
                                }}
                              />
                            </label>
                          </li>
                        ))}
                        <li>
                          <span
                            className={loading ? "" : styles["pointer"]}
                            onClick={() => {
                              if (loading) return;
                              setRecipients((oldRecipients) => {
                                oldRecipients.push("");

                                return [...oldRecipients];
                              });
                            }}
                          >
                            <AddIcon /> add recipient...
                          </span>
                        </li>
                      </ul>
                    </section>
                  )}
                  <span>
                    <button>
                      {isGifting ? <>Purchase</> : <>Subscribe</>}
                    </button>
                    <button
                      className={loading ? styles["loading"] : ""}
                      onClick={(e) => {
                        e.preventDefault();
                        setIsGifting(!isGifting);
                      }}
                    >
                      {isGifting ? <>My Subscription</> : <>Gift to Friends</>}
                    </button>
                  </span>
                </fieldset>
              </form>
            </>
          )}
        </main>
        <footer></footer>
      </div>
    )
  );
}
