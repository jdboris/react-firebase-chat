import React from "react";
import styles from "../css/chat-room.module.css";

import { auth } from "../app";

export function ChatMessage(props) {
  let { text, uid, photoURL, createdAt, username, fontSize } = props.message;
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
          <span style={{ fontSize: fontSize + "px" }}>{message}</span>
        </p>
      </div>
    </>
  );
}
