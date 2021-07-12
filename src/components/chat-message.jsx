import React from "react";
import ReactMarkdown from "react-markdown";
import styles from "../css/chat-room.module.css";

import { auth } from "../app";

export function ChatMessage(props) {
  let { text, uid, photoURL, createdAt, username, fontSize } = props.message;
  let { claims } = props.idToken;
  const messageClass = uid === auth.currentUser.uid ? "sent" : "received";

  let mouseDownSpot = null;

  const doesMentionCurrentUser = new RegExp(
    `@${auth.currentUser.displayName}\\b`,
    "g"
  ).test(text);

  text = text.replace(
    new RegExp(`@${auth.currentUser.displayName}\\b`, "g"),
    `**@${auth.currentUser.displayName}**`
  );

  function banUser() {
    props.bannedUsersRef.doc(props.message.uid).set({});
  }

  function deleteMessage() {
    props.messagesRef.doc(props.message.id).update({ isDeleted: true });
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
        <div>
          <span className={styles["message-username"]}>{username}</span>:{" "}
          <span style={{ fontSize: fontSize + "px" }}>
            <ReactMarkdown allowedElements={["p", "em", "strong", "u"]}>
              {text}
            </ReactMarkdown>
          </span>
        </div>
      </div>
    </>
  );
}
