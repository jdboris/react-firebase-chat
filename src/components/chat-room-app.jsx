import { getAnalytics } from "firebase/analytics";
import { connectAuthEmulator, getAuth, signOut } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { connectDatabaseEmulator, getDatabase } from "firebase/database";
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from "firebase/functions";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useCollectionData, useDocument } from "react-firebase-hooks/firestore";
import styles from "../css/chat-room.module.css";
import { idConverter } from "../utils/firestore";
import { setQueryParam } from "../utils/utils";
import { AlertDialog } from "./alert-dialog";
import { ChatRoom } from "./chat-room";

const useEmulators = import.meta.env.VITE_USE_EMULATORS === "true";

initializeApp({
  name: import.meta.env.VITE_FIREBASE_APP_NAME,
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  databaseURL:
    window.location.hostname === "localhost" && useEmulators
      ? import.meta.env.VITE_FIREBASE_LOCAL_DATABASE_URL
      : import.meta.env.VITE_FIREBASE_DATABASE_URL, // Realtime Database
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGE_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
});

// export const firestore = firebase.firestore();
export const firestore = getFirestore();
// export const analytics = firebase.analytics();
export const analytics = getAnalytics();
// export const functions = firebase.functions();
export const functions = getFunctions();
// export const auth = firebase.auth();
export const auth = getAuth();
// export const storage = firebase.storage();
export const storage = getStorage();

// const db = firebase.database();
const db = getDatabase();

if (window.location.hostname === "localhost" && useEmulators) {
  // auth.useEmulator("http://localhost:9099");
  connectAuthEmulator(auth, "http://localhost:9099");

  // firestore.useEmulator("localhost", 8080);
  connectFirestoreEmulator(firestore, "localhost", 8080);

  // functions.useEmulator("localhost", 5001);
  connectFunctionsEmulator(functions, "localhost", 5001);

  // db.useEmulator("localhost", 9000);
  connectDatabaseEmulator(db, "localhost", 9000);

  // storage.useEmulator("localhost", 9199);
  connectStorageEmulator(storage, "localhost", 9199);
}

export const conversationsRef = collection(firestore, "conversations");
export const usersRef = collection(firestore, "users");
export const modActionLogRef = collection(firestore, "modActionLog");
export const settingsRef = collection(firestore, "settings");
const messagesRef = collection(firestore, "messages");
const callbacksRef = collection(firestore, "callbacks");
const aggregateMessagesRef = collection(firestore, "aggregateMessages");

export const banUser = httpsCallable(getFunctions(), "banUser");
export const unbanUser = httpsCallable(getFunctions(), "unbanUser");
export const getCustomerPortalLink = httpsCallable(
  getFunctions(),
  "ext-firestore-stripe-subscriptions-createPortalLink"
);

function UsernameBadge({ username }) {
  const [user, setUser] = useState();
  useEffect(() => {
    (async () => {
      setUser(
        (
          await getDocs(
            query(
              collection(firestore, "users"),
              where("lowercaseUsername", "==", username.toLowerCase())
            )
          )
        ).docs[0].data()
      );
    })();
  }, []);

  return (
    <span
      className={styles["badge"]}
      style={{
        background: user && user.msgBgColor ? user.msgBgColor : "white",
        color: user && user.nameColor ? user.nameColor : "black",
      }}
    >
      {username}
    </span>
  );
}

function ChatRoomApp({
  className,
  onUserChange,
  callbackToTrigger,
  callbacks,
  headerLinks,
  style,
}) {
  const [authUser, isLoadingAuth] = useAuthState(auth);

  const [callbacksTriggered] = useCollectionData(
    query(callbacksRef, orderBy("triggeredAt", "desc"), limit(1)).withConverter(
      idConverter
    )
  );

  const [userSnapshot, isLoadingUserDoc] = useDocument(
    authUser ? doc(usersRef, authUser.uid) : null
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
    await signOut(auth);
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
          triggeredAt: serverTimestamp(),
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
          .map((otherUsername, i) => (
            <span key={`conversation-header-username-badge-${i}`}>
              <UsernameBadge username={otherUsername} />
            </span>
          ))
      : null;

  return (
    <div className={className + " " + styles["chat-app"]} style={style}>
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
            aggregateMessagesRef={aggregateMessagesRef}
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
            aggregateMessagesRef={aggregateMessagesRef}
            setConversationRef={setConversationRef}
            setDmMessagesRef={setDmMessagesRef}
            logout={logout}
            headerLinks={headerLinks}
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
