import React, { useRef, useEffect } from "react";
import styles from "../css/chat-room.module.css";
import { ChatMessage } from "./chat-message";

export function MessageList(props) {
  const messageList = useRef();

  useEffect(() => {
    messageList.current.scrollTo(0, messageList.current.scrollHeight);
  }, [props.sentMsgCount]);

  return (
    <section ref={messageList} className={styles["messages-section"]}>
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
