import React, { useEffect, useRef } from "react";
import styles from "../css/chat-room.module.css";
import { ChatMessage } from "./chat-message";

export function MessageList(props) {
  const messageList = useRef();

  useEffect(() => {
    messageList.current.scrollTop = 0;
  }, [props.sentMsgCount]);

  return (
    <section ref={messageList} className={styles["messages-section"]}>
      {props.messages &&
        // Must make a copy because props are immutable
        props.messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            stylesEnabled={props.stylesEnabled}
            onClick={props.onMessageClick}
            currentUser={props.currentUser}
            messagesRef={props.messagesRef}
          />
        ))}
    </section>
  );
}
