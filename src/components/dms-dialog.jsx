import { Close as CloseIcon, Search as SearchIcon } from "@mui/icons-material";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { default as React, useEffect, useMemo, useState } from "react";
import { useCollectionData } from "react-firebase-hooks/firestore";
import ReactPaginate from "react-paginate";
import styles from "../css/chat-room.module.css";
import paginationStyles from "../css/pagination-controls.module.css";
import { CustomError } from "../utils/errors";
import { idConverter } from "../utils/firestore";
import { timeout } from "../utils/utils";

export function DmsDialog(props) {
  const { userId, onChange } = props;

  const [searchUsername, setSearchUsername] = useState("");
  const [username, setUsername] = useState("");
  const [errors, setErrors] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const itemsPerPage = 10;
  const start = (page - 1) * itemsPerPage;
  const end = page * itemsPerPage;

  const [conversationsData] = useCollectionData(
    userId
      ? query(
          collection(getFirestore(), "conversations"),
          where("userIds", "array-contains", userId),
          orderBy("lastMessageSentAt", "desc")
        ).withConverter(idConverter)
      : null
  );

  const conversations = useMemo(
    () =>
      conversationsData &&
      conversationsData.filter((conversation) =>
        conversation.id.toLowerCase().includes(searchUsername)
      ),
    [searchUsername, conversationsData]
  );

  useEffect(() => {
    onChange(conversations);
  }, [conversations, userId]);

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
          <label>
            <input
              type="text"
              placeholder="Username..."
              onInput={(e) => {
                setSearchUsername(e.target.value.toLowerCase());
                setPage(1);
              }}
              value={searchUsername}
            />
            <button className={styles["alt-button"]}>
              <SearchIcon />
            </button>
          </label>
          <ul>
            {conversations &&
              conversations.slice(start, end).map((conversation, i) => {
                const lastReadAt = conversation.users[userId].lastReadAt;
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
                          doc(getFirestore(), "conversations", conversation.id)
                        );
                        await props.setDmMessagesRef(
                          collection(
                            getFirestore(),
                            "conversations",
                            conversation.id,
                            "messages"
                          )
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
                  throw new CustomError("Enter a username.");
                }

                const snapshot = await getDocs(
                  query(
                    collection(getFirestore(), "users"),
                    where("lowercaseUsername", "==", username.toLowerCase())
                  )
                );

                if (!snapshot.docs.length) {
                  throw new CustomError("User not found.");
                }

                if (snapshot.docs[0].id === userId) {
                  throw new CustomError("Cannot chat with yourself.");
                }

                const conversationId = combineStrings([
                  props.username,
                  snapshot.docs[0].data().username,
                ]);

                setDoc(
                  doc(getFirestore(), "conversations", conversationId),
                  {
                    lastMessageSentAt: 0,
                    // NOTE: This insanity is required for later queries with NoSQL
                    userIds: [userId, snapshot.docs[0].id],
                    users: {
                      [userId]: {
                        lastReadAt: serverTimestamp(),
                      },
                      [snapshot.docs[0].id]: {
                        lastReadAt: serverTimestamp(),
                      },
                    },
                  },
                  { merge: true }
                );

                // await conversationsRef
                //   .doc(conversationId)
                //   .collection("messages");

                await props.setConversationRef(
                  doc(getFirestore(), `conversations/${conversationId}`)
                );

                await props.setDmMessagesRef(
                  collection(
                    getFirestore(),
                    `conversations/${conversationId}/messages`
                  )
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
                    setErrors([
                      new CustomError("Verify your email to do that."),
                    ]);
                    return;
                  }
                  setErrors([new CustomError(error.message, error)]);
                });
            }}
          >
            {errors.map((error, i) => (
              <div key={i} className={styles["error"]}>
                {error.message}
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
              initialPage={page - 1}
              forcePage={page - 1}
              pageCount={Math.ceil(conversations.length / itemsPerPage)}
              pageRangeDisplayed={5}
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
