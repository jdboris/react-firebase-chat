import React, { useEffect, useRef, useState } from "react";
import styles from "../css/chat-room.module.css";
import { ChatMessage } from "./chat-message";

export function MessageList(props) {
  const {
    setErrors,
    setAlerts,
    messagesRef,
    defaultMessages,
    stylesEnabled,
    onMessageClick,
    currentUser,
    sentMsgCount,
    isPopMuted,
  } = props;
  const messageList = useRef();

  const [messages, setMessages] = useState([]);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!paused) {
      setMessages(defaultMessages || []);
    }
  }, [defaultMessages, paused]);

  useEffect(() => {
    messageList.current.scrollTop = 0;
  }, [sentMsgCount]);

  return (
    <section ref={messageList} className={styles["messages-section"]}>
      <div className={styles["pagination-controls"]}>
        {messages.length &&
          defaultMessages &&
          messages[0].id !== defaultMessages[0].id && (
            <button
              onClick={() => {
                setPaused(false);
              }}
            >
              Jump to present
            </button>
          )}
      </div>

      {messages &&
        // Must make a copy because props are immutable
        messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            setErrors={setErrors}
            setAlerts={setAlerts}
            message={msg}
            stylesEnabled={stylesEnabled}
            onClick={onMessageClick}
            currentUser={currentUser}
            messagesRef={messagesRef}
            isPopMuted={isPopMuted}
          />
        ))}

      <div className={styles["pagination-controls"]}>
        {messages.length >= 25 && (
          <button
            onClick={async () => {
              setPaused(true);
              const query = messagesRef
                .where("isDeleted", "==", false)
                .orderBy("createdAt", "desc")
                .startAfter(messages[messages.length - 1].createdAt)
                .limit(25);

              const snapshot = await query.get();
              const newMessages = snapshot.docs.map((doc) => {
                return { id: doc.id, ...doc.data() };
              });
              setMessages(newMessages);
            }}
          >
            Older
          </button>
        )}

        {messages.length &&
          defaultMessages &&
          messages[0].id !== defaultMessages[0].id && (
            <button
              onClick={async () => {
                setPaused(true);
                const query = messagesRef
                  .where("isDeleted", "==", false)
                  .orderBy("createdAt", "desc")
                  .endBefore(messages[0].createdAt)
                  .limitToLast(25);

                const snapshot = await query.get();
                const newMessages = snapshot.docs.map((doc) => {
                  return { id: doc.id, ...doc.data() };
                });

                if (newMessages[0].id === defaultMessages[0].id) {
                  setPaused(false);
                } else if (newMessages.length) {
                  setMessages(newMessages);
                }
              }}
            >
              Newer
            </button>
          )}
      </div>
    </section>
  );
}
