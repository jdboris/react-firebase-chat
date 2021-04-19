import React from "react";
import "./app.css";

import firebase from "firebase/app";
import "firebase/firestore";
import "firebase/auth";
import "firebase/analytics";

import { useAuthState } from "react-firebase-hooks/auth";
import { config } from "./firestore-config";

import { ChatRoom } from "./components/chat-room";
import { SignInForm } from "./components/sign-in-form";
import { SignOutButton } from "./components/sign-out-button";

firebase.initializeApp(config);

export const firestore = firebase.firestore();
export const analytics = firebase.analytics();
export const auth = firebase.auth();

function App() {
  const [user] = useAuthState(auth);

  return (
    <div className="chat-app">
      <header>{/* <SignOutButton /> */}</header>
      {user ? <ChatRoom /> : <SignInForm />}{" "}
    </div>
  );
}

export default App;
