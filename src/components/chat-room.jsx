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

  const sendMessage = async (e) => {
    e.preventDefault();

    const { uid, photoURL } = auth.currentUser;

    await messagesRef.add({
      text: formValue,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      uid,
      photoURL,
    });

    setFormValue("");
    dummy.current.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <div className={styles["chat-room"]}>
        <span ref={dummy}></span>
        {messages &&
          messages
            .reverse()
            .map((msg) => <ChatMessage key={msg.id} message={msg} />)}
      </div>

      <form onSubmit={sendMessage}>
        <textarea
          value={formValue}
          onChange={(e) => setFormValue(e.target.value)}
          placeholder="Type here to send a message"
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.target.form.dispatchEvent(
                new Event("submit", { cancelable: true })
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
  const { text, uid, photoURL } = props.message;

  const messageClass = uid === auth.currentUser.uid ? "sent" : "received";

  return (
    <>
      <div className={styles["message"] + " " + styles[messageClass]}>
        <img src={photoURL || "https://i.imgur.com/h2yCi23.jpg"} />
        <p>{text}</p>
      </div>
    </>
  );
}
