import { Close as CloseIcon } from "@mui/icons-material";
import { default as React, useState } from "react";
import { useCollectionData } from "react-firebase-hooks/firestore";
import { firestore } from "./chat-room-app";
import styles from "../css/chat-room.module.css";
import { sendToCustomerPortal, sendToStripe } from "../utils/stripe";
import { timeout } from "../utils/utils";

export function PremiumDialog(props) {
  const { isAnonymous, uid } = props;
  const [period, setPeriod] = useState(3);
  const [loading, setLoading] = useState(false);
  const query = firestore
    .collection("users")
    .doc(uid)
    .collection("subscriptions")
    .where("status", "==", "active")
    .where("role", "==", "premium");

  const [subscriptions] = useCollectionData(query);

  return (
    props.open && (
      <div className={styles["dialog"] + " " + styles["premium-dialog"]}>
        <header>
          Premium
          <CloseIcon
            onClick={() => {
              props.requestClose();
            }}
          />
        </header>
        <main>
          {subscriptions && subscriptions.length ? (
            <>
              {subscriptions.map((subscription, i) => {
                const expiration = new Date(Date.UTC(1970, 0, 1));
                expiration.setUTCSeconds(
                  subscription.current_period_end.seconds
                );

                const formatter = new Intl.DateTimeFormat(undefined, {
                  timeStyle: "short",
                  dateStyle: "short",
                });

                return (
                  <span key={i}>
                    Your subscription expires {formatter.format(expiration)}
                  </span>
                );
              })}

              <div>
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
              </div>
            </>
          ) : isAnonymous ? (
            <>Must create an account to upgrade to Premium.</>
          ) : (
            <>
              Upgrade to a Premium account for perks like more emojis, more
              message style options, and more...
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (loading) return;
                  setLoading(true);

                  timeout(5000, () => {
                    sendToStripe(uid, e.target.period.value, setLoading);
                  });
                }}
              >
                <label>
                  <input
                    type="radio"
                    name="period"
                    value={process.env.REACT_APP_STRIPE_3_MONTH_PRICE_ID}
                    onChange={() => setPeriod(3)}
                    defaultChecked
                  />{" "}
                  3 Months - $2/month
                </label>
                <label>
                  <input
                    type="radio"
                    name="period"
                    value={process.env.REACT_APP_STRIPE_6_MONTH_PRICE_ID}
                    onChange={() => setPeriod(6)}
                  />{" "}
                  6 Months - $1.5/month
                </label>
                <label>
                  <input
                    type="radio"
                    name="period"
                    value={process.env.REACT_APP_STRIPE_12_MONTH_PRICE_ID}
                    onChange={() => setPeriod(12)}
                  />{" "}
                  12 Months - $1/month
                </label>
                Billed every {period} months. Cancel any time.
                <label>
                  <button className={loading ? styles["loading"] : ""}>
                    Subscribe
                  </button>
                </label>
              </form>
            </>
          )}
        </main>
        <footer></footer>
      </div>
    )
  );
}
