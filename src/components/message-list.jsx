import React, { useEffect, useRef, useState } from "react";
import { firestore } from "./chat-room-app";
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
    setConfirmModal,
  } = props;
  const messageList = useRef();

  const [messages, setMessages] = useState([]);
  const [paused, setPaused] = useState(false);
  const [stickToBottom, setStickToBottom] = useState(true);

  function snapToBottom() {
    // NOTE: scrollTop is relative to bottom because of flex-direction: column-reverse.
    //       And positive numbers go DOWN (10 means 10 below the bottom).
    messageList.current.scrollTop = 10;
  }

  useEffect(() => {
    if (!paused) {
      setMessages(defaultMessages || []);

      // If near the bottom of the list
      if (Math.abs(messageList.current.scrollTop) < 100) {
        snapToBottom();
        setStickToBottom(true);
      } else {
        setStickToBottom(false);
      }
    }
  }, [defaultMessages, paused]);

  useEffect(() => {
    // NOTE: scrollTop is relative to bottom because of flex-direction: column-reverse
    //       And positive numbers go DOWN (10 means 10 below the bottom).
    messageList.current.scrollTop = 10;
    setStickToBottom(true);
  }, [sentMsgCount]);

  return (
    <section
      ref={messageList}
      className={
        styles["messages-section"] +
        " " +
        (stickToBottom ? styles["stick-to-bottom"] : "")
      }
    >
      <div>
        <div className={styles["pagination-controls"]}>
          {messages.length >= 25 && (
            <button
              onClick={async () => {
                setPaused(true);
                const query = firestore
                  .collection("messages")
                  .where("isDeleted", "==", false)
                  .orderBy("createdAt", "desc")
                  .startAfter(messages[messages.length - 1].createdAt)
                  .limit(25);

                const snapshot = await query.get();
                const newMessages = snapshot.docs.map((doc) => {
                  return { id: doc.id, ...doc.data() };
                });

                snapToBottom();

                setMessages(newMessages);
              }}
            >
              Older
            </button>
          )}
        </div>
        {messages &&
          // Must make a copy because props are immutable
          [...messages].reverse().map((msg) => (
            <ChatMessage
              // NOTE: MUST use msg.id rather than array index because index will change and force re-render
              key={msg.id}
              setErrors={setErrors}
              setAlerts={setAlerts}
              message={msg}
              stylesEnabled={stylesEnabled}
              onClick={onMessageClick}
              currentUser={currentUser}
              messagesRef={messagesRef}
              isPopMuted={isPopMuted}
              setConfirmModal={setConfirmModal}
            />
          ))}

        <div className={styles["pagination-controls"]}>
          {messages.length &&
            defaultMessages &&
            defaultMessages.length &&
            messages[0].id !== defaultMessages[0].id && (
              <button
                onClick={async () => {
                  try {
                    setPaused(true);

                    // NOTE: limitToLast is broken because of another Firestore bug.
                    const query = firestore
                      .collection("messages")
                      .where("isDeleted", "==", false)
                      .orderBy("createdAt", "asc")
                      .startAfter(messages[0].createdAt)
                      .limit(25);

                    const snapshot = await query.get();
                    const newMessages = snapshot.docs
                      .map((doc) => {
                        return { id: doc.id, ...doc.data() };
                      })
                      .reverse();

                    if (
                      newMessages.length &&
                      defaultMessages &&
                      newMessages[0].id === defaultMessages[0].id
                    ) {
                      setPaused(false);
                    } else if (newMessages.length) {
                      setMessages(newMessages);
                    }
                  } catch (e) {
                    console.error(e);
                  }
                }}
              >
                Newer
              </button>
            )}
          {messages.length &&
            defaultMessages &&
            defaultMessages.length &&
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
      </div>
    </section>
  );
}
