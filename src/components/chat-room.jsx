import React, { useRef, useState } from "react";
import styles from "../css/chat-room.module.css";

import firebase from "firebase/app";

import { useCollectionData } from "react-firebase-hooks/firestore";

import { firestore, auth } from "../app";

export function ChatRoom(props) {
  const dummy = useRef();
  const messagesRef = firestore.collection("messages");
  const query = messagesRef.orderBy("createdAt").limit(25);

  const [messages] = useCollectionData(query, { idField: "id" });

  const [formValue, setFormValue] = useState("");

  let messageInput = null;

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
    </>
  );
}

function ChatMessage(props) {
  let { text, uid, photoURL, createdAt, username } = props.message;
  const messageClass = uid === auth.currentUser.uid ? "sent" : "received";
  const claims = auth.currentUser.getIdTokenResult().claims;
  let mouseDownSpot = null;

  const doesMentionCurrentUser = text.includes(
    `@${auth.currentUser.displayName} `
  );

  let parts = text.split(`@${auth.currentUser.displayName} `);
  let message = [parts[0]];

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
          if (mouseDownSpot) {
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
          <span className={styles["message-timestamp"]}>
            {createdAt && createdAt.toDate().toLocaleString()}
          </span>
        </span>
        <p>
          {username}: {message}
        </p>
      </div>
    </>
  );
}
