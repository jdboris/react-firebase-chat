import "firebase/compat/analytics";
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/functions";
import "firebase/compat/storage";
import React, { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { AlertDialog } from "./alert-dialog";
import { ChatRoom } from "./chat-room";
import { SignInForm } from "./sign-in-form";
import styles from "../css/chat-room.module.css";
import { setQueryParam } from "../utils/utils";

const useEmulators = true;

firebase.initializeApp({
  name: process.env.REACT_APP_FIREBASE_APP_NAME,
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  databaseURL:
    window.location.hostname === "localhost" && useEmulators
      ? process.env.REACT_APP_FIREBASE_LOCAL_DATABASE_URL
      : process.env.REACT_APP_FIREBASE_DATABASE_URL, // Realtime Database
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGE_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
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

function ChatRoomApp() {
  const [user] = useAuthState(auth);

  const email = user && !user.isAnonymous ? user.email : "";
  const [conversationRef, setConversationRef] = useState(null);
  const [dmMessagesRef, setDmMessagesRef] = useState(null);
  const [alerts, setAlerts] = useState([]);

  const logout = async () => {
    await auth.signOut();
    setConversationRef(null);
    setDmMessagesRef(null);
  };

  useEffect(() => {
    const url = new URL(window.location);

    if (url.searchParams.get("chat-email-verified")) {
      // NOTE: The order matters
      setAlerts(["Email verification successful!"]);
      setQueryParam("chat-email-verified", null);
    }

    if (url.searchParams.get("chat-logout")) {
      setQueryParam("chat-logout", null);
      logout();
    }
  }, []);

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
              setAlerts={setAlerts}
              conversationRef={conversationRef}
              setConversationRef={setConversationRef}
              messagesRef={dmMessagesRef}
              setDmMessagesRef={setDmMessagesRef}
              logout={logout}
              header={header}
              dms={true}
            />
          ) : (
            <ChatRoom
              user={user}
              setAlerts={setAlerts}
              messagesRef={messagesRef}
              setConversationRef={setConversationRef}
              setDmMessagesRef={setDmMessagesRef}
              logout={logout}
            />
          )}
        </>
      ) : (
        <SignInForm email={email} setAlerts={setAlerts} logout={logout} />
      )}

      <AlertDialog
        alerts={alerts}
        requestClose={() => {
          setAlerts([]);
        }}
      />
    </div>
  );
}

export default ChatRoomApp;
