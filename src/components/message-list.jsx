import React, { useRef, useEffect } from "react";
import styles from "../css/chat-room.module.css";
import { ChatMessage } from "./chat-message";

export function MessageList(props) {
  const dummy = useRef();

  useEffect(() => {
    dummy.current.scrollIntoView({ behavior: "smooth" });
  }, [props.sentMsgCount]);

  return (
    <section className={styles["messages-section"]}>
      <span ref={dummy}></span>
      {props.messages &&
        // Must make a copy because props are immutable
        props.messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            userStyles={props.userStyles}
            onClick={props.onMessageClick}
            idToken={props.idToken}
          />
        ))}
    </section>
  );
}
