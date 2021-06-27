import React, { useRef, useState } from "react";
import styles from "../css/chat-room.module.css";

import firebase from "firebase/app";
import "firebase/database";

import { useCollectionData } from "react-firebase-hooks/firestore";

import { firestore, auth } from "../app";

export function ChatRoom(props) {
  // Fetch the current user's ID from Firebase Authentication.
  let uid = firebase.auth().currentUser.uid;
  let offlineTimeout = null;

  // Create a reference to this user's specific status node.
  // This is where we will store data about being online/offline.
  let userStatusDatabaseRef = firebase.database().ref("/status/" + uid);

  // We'll create two constants which we will write to
  // the Realtime database when this device is offline
  // or online.
  let isOfflineForDatabase = {
    state: "offline",
    last_changed: firebase.database.ServerValue.TIMESTAMP,
  };

  let isOnlineForDatabase = {
    state: "online",
    last_changed: firebase.database.ServerValue.TIMESTAMP,
  };

  userStatusDatabaseRef.set(isOnlineForDatabase);

  let userStatusFirestoreRef = firebase.firestore().doc("/status/" + uid);

  // Firestore uses a different server timestamp value, so we'll
  // create two more constants for Firestore state.
  let isOfflineForFirestore = {
    state: "offline",
    last_changed: firebase.firestore.FieldValue.serverTimestamp(),
  };

  let isOnlineForFirestore = {
    state: "online",
    last_changed: firebase.firestore.FieldValue.serverTimestamp(),
  };

  firebase
    .database()
    .ref(".info/connected")
    .on("value", function (snapshot) {
      if (snapshot.val() == false) {
        // Instead of simply returning, we'll also set Firestore's state
        // to 'offline'. This ensures that our Firestore cache is aware
        // of the switch to 'offline.'
        userStatusFirestoreRef.set(isOfflineForFirestore);
        return;
      }

      userStatusDatabaseRef
        .onDisconnect()
        .set(isOfflineForDatabase)
        .then(function () {
          userStatusDatabaseRef.set(isOnlineForDatabase);

          // We'll also add Firestore set here for when we come online.
          userStatusFirestoreRef.set(isOnlineForFirestore);
        });
    });

  userStatusFirestoreRef.onSnapshot(function (doc) {
    let isOnline = doc.data().state == "online";
    if (isOnline == false) {
      if (offlineTimeout === null) {
        // Wait for 3 seconds before telling the user the connection was lost
        offlineTimeout = setTimeout(() => {
          setIsOnline(false);
        }, 3000);
      }
    } else if (offlineTimeout !== null) {
      clearTimeout(offlineTimeout);
      setIsOnline(true);
    }
  });

  const dummy = useRef();
  const messagesRef = firestore.collection("messages");
  const usersRef = firestore.collection("users");
  const bannedUsersRef = firestore.collection("bannedUsers");

  const query = messagesRef
    .orderBy("createdAt")
    .limit(25)
    .where("isDeleted", "==", false);

  const [messages] = useCollectionData(query, { idField: "id" });

  const [isOnline, setIsOnline] = useState(true);
  const [formValue, setFormValue] = useState("");
  const [idToken, setIdToken] = useState("");
  let messageInput = null;

  if (!idToken) {
    auth.currentUser.getIdTokenResult().then((idTokenResult) => {
      setIdToken(idTokenResult);
    });
  }

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = formValue;
    setFormValue("");

    const { uid, photoURL, displayName } = auth.currentUser;

    await messagesRef.add({
      text: text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      username: displayName,
      uid,
      photoURL,
      isDeleted: false,
    });

    dummy.current.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <div className={styles["chat-room"]}>
        <span ref={dummy}></span>
        {messages &&
          messages.reverse().map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onClick={(targetUsername) => {
                setFormValue(formValue + " @" + targetUsername + " ");
                messageInput.focus();
              }}
              idToken={idToken}
              messagesRef={messagesRef}
              bannedUsersRef={bannedUsersRef}
            />
          ))}
      </div>

      <form onSubmit={sendMessage}>
        <textarea
          ref={(input) => {
            messageInput = input;
          }}
          autoFocus
          value={formValue}
          onChange={(e) => setFormValue(e.target.value)}
          placeholder="Type here to send a message"
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.target.form.dispatchEvent(
                new Event("submit", {
                  cancelable: true,
                  // BUGFIX: https://github.com/final-form/react-final-form/issues/878#issuecomment-745364350
                  bubbles: true,
                })
              );
              e.preventDefault();
            }
          }}
        ></textarea>
      </form>
      {!isOnline ? (
        <div className={styles["chat-room-overlay"]}>
          <div className={styles["overlay-message"]}>
            <div>Connection failed.</div>
            <div>Reconnecting...</div>
          </div>
        </div>
      ) : (
        ""
      )}
    </>
  );
}

function ChatMessage(props) {
  let { text, uid, photoURL, createdAt, username } = props.message;
  let { claims } = props.idToken;
  const messageClass = uid === auth.currentUser.uid ? "sent" : "received";

  let mouseDownSpot = null;

  const doesMentionCurrentUser = text.includes(
    `@${auth.currentUser.displayName} `
  );

  let parts = text.split(`@${auth.currentUser.displayName} `);
  let message = [parts[0]];

  function banUser() {
    props.bannedUsersRef.doc(props.message.uid).set({});
  }

  function deleteMessage() {
    props.messagesRef.doc(props.message.id).update({ isDeleted: true });
  }

  for (let i = 1; i < parts.length; i++) {
    message.push(<strong>@{auth.currentUser.displayName} </strong>);
    message.push(parts[i]);
  }

  return (
    <>
      <div
        className={
          styles["message"] +
          " " +
          styles[messageClass] +
          " " +
          (doesMentionCurrentUser ? styles["mention"] : "")
        }
        onMouseDown={(e) => {
          mouseDownSpot = { x: e.pageX, y: e.pageY };
        }}
        onMouseUp={(e) => {
          // Left click
          if (e.button == 0 && mouseDownSpot) {
            let a = mouseDownSpot.x - e.pageX;
            let b = mouseDownSpot.y - e.pageY;

            let distance = Math.sqrt(a * a + b * b);

            if (distance <= 2) {
              props.onClick(username);
              mouseDownSpot = null;
            }
          }
        }}
      >
        <img src={photoURL || "https://i.imgur.com/h2yCi23.jpg"} />
        <span className={styles["message-details"]}>
          {claims.isModerator ? <button onClick={banUser}>X</button> : ""}
          {claims.isModerator ? <button onClick={deleteMessage}>X</button> : ""}
          <span className={styles["message-timestamp"]}>
            {createdAt && createdAt.toDate().toLocaleString()}
          </span>
        </span>
        <p>
          <span className={styles["message-username"]}>{username}</span>:{" "}
          {message}
        </p>
      </div>
    </>
  );
}
