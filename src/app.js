import React from "react";
import styles from "./css/chat-room.module.css";

import firebase from "firebase/app";
import "firebase/firestore";
import "firebase/auth";
import "firebase/analytics";
import "firebase/functions";

import { useAuthState } from "react-firebase-hooks/auth";

import { ChatRoom } from "./components/chat-room";
import { SignInForm } from "./components/sign-in-form";
import { SignOutButton } from "./components/sign-out-button";

firebase.initializeApp({
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: "stream-site-9ebd9.firebaseapp.com",
  projectId: "stream-site-9ebd9",
  storageBucket: "stream-site-9ebd9.appspot.com",
  messagingSenderId: "1008086677721",
  appId: "1:1008086677721:web:e8ee668830765c3df626c8",
  measurementId: "G-T9226MT70Q",
});

export const firestore = firebase.firestore();
export const analytics = firebase.analytics();
export const functions = firebase.functions();
export const auth = firebase.auth();

if (window.location.hostname == "localhost") {
  auth.useEmulator("http://localhost:9099");
  firestore.useEmulator("localhost", 8080);
  // firestore.settings({ host: "localhost:8080", ssl: false });
  functions.useEmulator("localhost", 5001);
  // functions.useFunctionsEmulator("http://localhost:5001");
}

function App() {
  const [user] = useAuthState(auth);

  return (
    <div className={styles["chat-app"]}>
      <header>{/* <SignOutButton /> */}</header>
      {user ? <ChatRoom /> : <SignInForm />}
    </div>
  );
}

export default App;
