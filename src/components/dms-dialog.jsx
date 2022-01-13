import { Close as CloseIcon } from "@mui/icons-material";
import { default as React, useState } from "react";
import firebase from "firebase/compat/app";
import ReactPaginate from "react-paginate";
import { conversationsRef, firestore, usersRef } from "./chat-room-app";
import styles from "../css/chat-room.module.css";
import paginationStyles from "../css/pagination-controls.module.css";
import { timeout } from "../utils/utils";
import { translateError } from "../utils/errors";

export function DmsDialog(props) {
  const { conversations } = props;

  const [username, setUsername] = useState("");
  const [errors, setErrors] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const itemsPerPage = props.itemsPerPage;
  const start = (page - 1) * itemsPerPage;
  const end = page * itemsPerPage;

  const combineStrings = (strings) => {
    strings.sort();
    return strings.join(":");
  };

  return (
    props.open && (
      <div className={styles["dialog"]}>
        <header>
          Conversations
          <CloseIcon
            onClick={() => {
              setUsername("");
              setErrors([]);
              props.requestClose();
            }}
          />
        </header>
        <main>
          <ul>
            {conversations &&
              conversations.slice(start, end).map((conversation, i) => {
                const lastReadAt = conversation.users[props.uid].lastReadAt;
                let isUnread = false;

                // NOTE: lastReadAt will be null from latency compensation
                if (lastReadAt !== null) {
                  isUnread = conversation.lastMessageSentAt > lastReadAt;
                }

                return (
                  <li key={i}>
                    <button
                      className={
                        styles["link"] +
                        " " +
                        (isUnread ? styles["unread-conversation"] : "")
                      }
                      onClick={async () => {
                        await props.setConversationRef(
                          firestore
                            .collection("conversations")
                            .doc(conversation.id)
                        );
                        await props.setDmMessagesRef(
                          firestore
                            .collection("conversations")
                            .doc(conversation.id)
                            .collection("messages")
                        );
                        props.requestClose();
                      }}
                    >
                      {conversation.id
                        .split(":")
                        .filter((e) => e !== props.username)
                        .toString()}
                    </button>
                  </li>
                );
              })}
          </ul>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              setErrors([]);

              timeout(5000, async () => {
                if (!username) {
                  throw new Error("Enter a username.");
                }
                const snapshot = await usersRef
                  .where("lowercaseUsername", "==", username.toLowerCase())
                  .get();

                if (!snapshot.docs.length) {
                  throw new Error("User not found.");
                }

                if (snapshot.docs[0].id === props.uid) {
                  throw new Error("Cannot chat with yourself.");
                }

                const conversationId = combineStrings([
                  props.username,
                  snapshot.docs[0].data().username,
                ]);

                await conversationsRef.doc(conversationId).set(
                  {
                    lastMessageSentAt: 0,
                    // NOTE: This insanity is required for later queries with NoSQL
                    userIds: [props.uid, snapshot.docs[0].id],
                    users: {
                      [props.uid]: {
                        lastReadAt:
                          firebase.firestore.FieldValue.serverTimestamp(),
                      },
                      [snapshot.docs[0].id]: {
                        lastReadAt:
                          firebase.firestore.FieldValue.serverTimestamp(),
                      },
                    },
                  },
                  { merge: true }
                );

                // await conversationsRef
                //   .doc(conversationId)
                //   .collection("messages");

                await props.setConversationRef(
                  firestore.collection("conversations").doc(conversationId)
                );

                await props.setDmMessagesRef(
                  firestore
                    .collection("conversations")
                    .doc(conversationId)
                    .collection("messages")
                );

                props.requestClose();
              })
                .then(() => {
                  setLoading(false);
                  props.requestClose();
                })
                .catch((error) => {
                  setLoading(false);
                  if (error.code === "permission-denied") {
                    setErrors(["Verify your email to do that."]);
                    return;
                  }
                  setErrors([translateError(error).message]);
                });
            }}
          >
            {errors.map((error, i) => (
              <div key={i} className={styles["error"]}>
                {error}
              </div>
            ))}
            <input
              type="text"
              placeholder="Username"
              onInput={(e) => {
                setUsername(e.target.value);
              }}
              value={username}
            />{" "}
            <button className={loading ? styles["loading"] : ""}>
              Start Conversation
            </button>
          </form>
        </main>
        <footer className={paginationStyles["pagination-controls"]}>
          {conversations && (
            <ReactPaginate
              pageCount={Math.ceil(conversations.length / itemsPerPage)}
              pageRangeDisplayed={10}
              marginPagesDisplayed={2}
              onPageChange={(item) => {
                setPage(item.selected + 1);
              }}
              nextLabel={">"}
              previousLabel={"<"}
              disabledClassName={paginationStyles["disabled"]}
              activeClassName={paginationStyles["selected"]}
            />
          )}
        </footer>
      </div>
    )
  );
}
