import CloseIcon from "@material-ui/icons/Close";
import { default as React, useState } from "react";
import firebase from "firebase/app";
import ReactPaginate from "react-paginate";
import { conversationsRef, firestore, usersRef } from "../app";
import styles from "../css/chat-room.module.css";
import paginationStyles from "../css/pagination-controls.module.css";

export function DmsDialog(props) {
  const { conversations } = props;

  const [username, setUsername] = useState("");
  const [page, setPage] = useState(1);
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
                        props.setDmMessagesRef(
                          firestore
                            .collection("conversations")
                            .doc(conversation.id)
                            .collection("messages")
                        );
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
              if (username) {
                const snapshot = await usersRef
                  .where("username", "==", username)
                  .get();

                if (!snapshot.docs.length) {
                  // Error: User not found
                  return;
                }

                const conversationId = combineStrings([
                  props.username,
                  username,
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

                props.setDmMessagesRef(
                  firestore
                    .collection("conversations")
                    .doc(conversationId)
                    .collection("messages")
                );

                props.requestClose();
              }
            }}
          >
            <input
              type="text"
              placeholder="username"
              onInput={(e) => {
                setUsername(e.target.value);
              }}
              value={username}
            />{" "}
            <button>Send Message</button>
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
