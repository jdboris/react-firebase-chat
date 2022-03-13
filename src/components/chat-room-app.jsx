import "firebase/compat/analytics";
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/functions";
import "firebase/compat/storage";
import React, { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useCollectionData, useDocument } from "react-firebase-hooks/firestore";
import styles from "../css/chat-room.module.css";
import { idConverter } from "../utils/firestore";
import { setQueryParam } from "../utils/utils";
import { AlertDialog } from "./alert-dialog";
import { ChatRoom } from "./chat-room";

const useEmulators = process.env.REACT_APP_USE_EMULATORS === "true";

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
const callbacksRef = firestore.collection("callbacks");

export const banUser = firebase.functions().httpsCallable("banUser");
export const unbanUser = firebase.functions().httpsCallable("unbanUser");
export const getCustomerPortalLink = firebase
  .functions()
  .httpsCallable("ext-firestore-stripe-subscriptions-createPortalLink");

export function ChatRoomApp({
  className,
  onUserChange,
  callbackToTrigger,
  callbacks,
}) {
  const [authUser, isLoadingAuth] = useAuthState(auth);

  const [callbacksTriggered] = useCollectionData(
    callbacksRef
      .orderBy("triggeredAt", "desc")
      .limit(1)
      .withConverter(idConverter)
  );

  const [userSnapshot, isLoadingUserDoc] = useDocument(
    authUser ? usersRef.doc(authUser.uid) : null
  );

  // If either is loading or they don't match yet
  const isLoadingUser =
    isLoadingAuth ||
    isLoadingUserDoc ||
    (authUser != null && (!userSnapshot || authUser.uid != userSnapshot.id));

  // console.log(
  //   "-----------------------------------------------------------------"
  // );
  // console.log("isLoadingUser: ", isLoadingUser);
  // console.log("isLoadingAuth: ", isLoadingAuth);
  // console.log("isLoadingUserDoc: ", isLoadingUserDoc);
  // console.log(
  //   "dont match: ",
  //   authUser != null && (!userSnapshot || authUser.uid != userSnapshot.id)
  // );
  // console.log("userSnapshot: ", userSnapshot);
  // console.log("authUser.uid: ", authUser && authUser.uid);
  // console.log("userSnapshot.id: ", userSnapshot && userSnapshot.id);

  const user =
    !isLoadingUser && authUser && userSnapshot
      ? {
          uid: authUser.uid,
          photoUrl: authUser.photoURL,
          email: authUser.email,
          emailVerified: authUser.emailVerified,
          auth: authUser,
          ...userSnapshot.data(),
        }
      : null;

  const [conversationRef, setConversationRef] = useState(null);
  const [dmMessagesRef, setDmMessagesRef] = useState(null);
  const [alerts, setAlerts] = useState([]);

  const logout = async () => {
    await auth.signOut();
    setConversationRef(null);
    setDmMessagesRef(null);
  };

  useEffect(() => {
    // NOTE: Must include the authUser in case idToken is required
    onUserChange(authUser, user);
  }, [authUser, userSnapshot]);

  const callbackTriggered =
    callbacksTriggered && callbacksTriggered.length
      ? callbacksTriggered[0]
      : { id: 0 };

  useEffect(() => {
    if (callbackTriggered.id) {
      const lastTriggeredId = localStorage.getItem("callbackTriggered.id");
      if (lastTriggeredId !== callbackTriggered.id) {
        if (callbacks && callbackTriggered.name in callbacks) {
          callbacks[callbackTriggered.name](...callbackTriggered.arguments);
          localStorage.setItem("callbackTriggered.id", callbackTriggered.id);
        }
      }
    }
  }, [callbackTriggered.id]);

  useEffect(() => {
    if (callbackToTrigger && callbacks) {
      if (callbackToTrigger.name in callbacks) {
        // TODO: Add doc to callbacks collection, to be called on all clients
        callbacksRef.add({
          name: callbackToTrigger.name,
          arguments: callbackToTrigger.arguments,
          triggeredAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  }, [callbackToTrigger, callbacks]);

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
    conversationRef && authUser
      ? conversationRef.id
          .split(":")
          .filter((e) => e !== authUser.displayName)
          .toString()
      : "";

  return (
    <div className={className + " " + styles["chat-app"]}>
      {/* {user ? ( */}
      <>
        {dmMessagesRef ? (
          <ChatRoom
            user={user}
            isLoadingUser={isLoadingUser}
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
            isLoadingUser={isLoadingUser}
            setAlerts={setAlerts}
            messagesRef={messagesRef}
            setConversationRef={setConversationRef}
            setDmMessagesRef={setDmMessagesRef}
            logout={logout}
          />
        )}
      </>
      {/*  ) : ( {" "}
      <LogInForm email={email} setAlerts={setAlerts} logout={logout} />
       )} */}
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
