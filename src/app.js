import "firebase/analytics";
import firebase from "firebase/app";
import { loadStripe } from "@stripe/stripe-js";
import "firebase/auth";
import "firebase/firestore";
import "firebase/functions";
import "firebase/storage";
import React, { useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { ChatRoom } from "./components/chat-room";
import { SignInForm } from "./components/sign-in-form";
import styles from "./css/chat-room.module.css";

// import { SignOutButton } from "./components/sign-out-button";

let databaseUrl = "https://stream-site-9ebd9-default-rtdb.firebaseio.com";

if (window.location.hostname == "localhost") {
  databaseUrl = "http://localhost:9000/?ns=stream-site-9ebd9-default-rtdb";
}

firebase.initializeApp({
  name: "stream-site-9ebd9",
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: "stream-site-9ebd9.firebaseapp.com",
  projectId: "stream-site-9ebd9",
  storageBucket: "stream-site-9ebd9.appspot.com",
  databaseURL: databaseUrl, // Realtime Database
  messagingSenderId: "1008086677721",
  appId: "1:1008086677721:web:e8ee668830765c3df626c8",
  measurementId: "G-T9226MT70Q",
});

export const firestore = firebase.firestore();
export const analytics = firebase.analytics();
export const functions = firebase.functions();
export const auth = firebase.auth();
export const storage = firebase.storage();

const db = firebase.database();

if (window.location.hostname == "localhost") {
  auth.useEmulator("http://localhost:9099");
  firestore.useEmulator("localhost", 8080);
  // firestore.settings({ host: "localhost:8080", ssl: false });
  functions.useEmulator("localhost", 5001);
  // functions.useFunctionsEmulator("http://localhost:5001");
  db.useEmulator("localhost", 9000);
  storage.useEmulator("localhost", 9199);
}

export const conversationsRef = firestore.collection("conversations");
export const usersRef = firestore.collection("users");
export const modActionLogRef = firestore.collection("modActionLog");
export const settingsRef = firestore.collection("settings");
const messagesRef = firestore.collection("messages");

export const banUser = firebase.functions().httpsCallable("banUser");
export const unbanUser = firebase.functions().httpsCallable("unbanUser");
export const getCustomerPortalLink = firebase
  .functions()
  .httpsCallable("ext-firestore-stripe-subscriptions-createPortalLink");

export async function sendToStripe(uid, priceId) {
  return firestore
    .collection("users")
    .doc(uid)
    .collection("checkout_sessions")
    .add({
      price: priceId, // todo price Id from your products price in the Stripe Dashboard
      success_url: window.location.origin, // return user to this screen on successful purchase
      cancel_url: window.location.origin, // return user to this screen on failed purchase
    })
    .then((docRef) => {
      // Wait for the checkoutSession to get attached by the extension
      docRef.onSnapshot(async (snap) => {
        const { error, sessionId } = snap.data();

        if (error) {
          // Show an error to your customer and inspect
          // your Cloud Function logs in the Firebase console.
          console.error(`An error occurred: ${error.message}`);
        }

        if (sessionId) {
          // We have a session, let's redirect to Checkout
          console.log(`redirecting`);
          const stripe = await loadStripe(
            process.env.REACT_APP_STRIPE_PUBLIC_API_KEY
          );

          await stripe.redirectToCheckout({ sessionId });
        }
      });
    });
}

function App() {
  const [user] = useAuthState(auth);
  const email = user && !user.isAnonymous ? user.email : "";
  const [dmMessagesRef, setDmMessagesRef] = useState(null);

  // NOTE: This is a safe usage of displayName
  const header =
    dmMessagesRef && user
      ? dmMessagesRef.parent.id
          .split(":")
          .filter((e) => e !== user.displayName)
          .toString()
      : "";

  return (
    <div className={styles["chat-app"]}>
      {user ? (
        <>
          {dmMessagesRef ? (
            <ChatRoom
              user={user}
              messagesRef={dmMessagesRef}
              setDmMessagesRef={setDmMessagesRef}
              header={header}
              dms={true}
            />
          ) : (
            <ChatRoom
              user={user}
              messagesRef={messagesRef}
              setDmMessagesRef={setDmMessagesRef}
            />
          )}
        </>
      ) : (
        <SignInForm email={email} />
      )}
    </div>
  );
}

export default App;
