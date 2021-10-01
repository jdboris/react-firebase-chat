import "firebase/analytics";
import firebase from "firebase/app";
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

const useEmulators = true;

let databaseUrl = "https://stream-site-9ebd9-default-rtdb.firebaseio.com";

if (window.location.hostname === "localhost" && useEmulators) {
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

if (window.location.hostname === "localhost" && useEmulators) {
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

function App() {
  const [user] = useAuthState(auth);
  const email = user && !user.isAnonymous ? user.email : "";
  const [conversationRef, setConversationRef] = useState(null);
  const [dmMessagesRef, setDmMessagesRef] = useState(null);

  const url = new URL(window.location);
  // Force a logout to refresh the token
  if (url.searchParams.get("chat-logout") && user) {
    url.searchParams.delete("chat-logout");
    const queryString = url.searchParams.toString();
    const hash = window.location.hash;

    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${
        queryString ? "?" + queryString : ""
      }${hash}`
    );
    auth.signOut();
  }

  // NOTE: This is a safe usage of displayName
  const header =
    conversationRef && user
      ? conversationRef.id
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
              conversationRef={conversationRef}
              setConversationRef={setConversationRef}
              messagesRef={dmMessagesRef}
              setDmMessagesRef={setDmMessagesRef}
              header={header}
              dms={true}
            />
          ) : (
            <ChatRoom
              user={user}
              messagesRef={messagesRef}
              setConversationRef={setConversationRef}
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
