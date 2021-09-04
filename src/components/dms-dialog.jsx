import CloseIcon from "@material-ui/icons/Close";
import { default as React, useState } from "react";
import { useCollectionData } from "react-firebase-hooks/firestore";
import ReactPaginate from "react-paginate";
import { conversationsRef, firestore, usersRef } from "../app";
import styles from "../css/chat-room.module.css";
import paginationStyles from "../css/pagination-controls.module.css";

export function DmsDialog(props) {
  const [username, setUsername] = useState("");
  const query = props.open
    ? conversationsRef.where("users", "array-contains", props.uid)
    : null;
  const [conversations, loading, error] = useCollectionData(query, {
    idField: "id",
  });

  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  const start = (page - 1) * itemsPerPage;
  const end = page * itemsPerPage;

  const combineStrings = (strings) => {
    strings.sort();
    return strings.join(":");
  };

  return (
    props.open && (
      <div className={styles["dialog"] + " " + styles["filtered-words"]}>
        <header>
          Direct Messages
          <CloseIcon
            onClick={() => {
              props.requestClose();
            }}
          />
        </header>
        <main>
          {conversations &&
            conversations.slice(start, end).map((conversation) => {
              return (
                <div>
                  <a
                    href="#"
                    onClick={async (e) => {
                      e.preventDefault();
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
                  </a>
                </div>
              );
            })}
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

                await conversationsRef
                  .doc(combineStrings([props.username, username]))
                  .set(
                    { users: [props.uid, snapshot.docs[0].id] },
                    { merge: true }
                  );

                conversationsRef
                  .doc(combineStrings([props.username, username]))
                  .collection("messages");
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
            />
          )}
        </footer>
      </div>
    )
  );
}
