import React, { useRef, useState, useEffect } from "react";
import styles from "../css/chat-room.module.css";
import MenuIcon from "@material-ui/icons/Menu";
import TextFormatIcon from "@material-ui/icons/TextFormat";
import CloseIcon from "@material-ui/icons/Close";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import FormatColorTextIcon from "@material-ui/icons/FormatColorText";

import firebase from "firebase/app";
import { firestore, auth } from "../app";

import { useCollectionData } from "react-firebase-hooks/firestore";
import { presence } from "../presence";
// import { getProviders } from "../oembed";
import { ChatMessage } from "./chat-message";
import { toggleSelectionMarkup, MARKUP_SYMBOLS } from "../markdown";

let uid = null;

export function ChatRoom(props) {
  const [isOnline, setIsOnline] = useState(true);
  const [messageValue, setMessageValue] = useState("");
  const [idToken, setIdToken] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [fontSize, setFontSize] = useState(13);

  const [isUsersOpen, setUsersOpen] = useState(false);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isFormatOpen, setFormatOpen] = useState(false);
  const [isFontOpen, setFontOpen] = useState(false);
  const [isFontSizeOpen, setFontSizeOpen] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const dummy = useRef();

  let messageInput = useRef();

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = messageValue;
    setMessageValue("");

    const { uid, photoURL, displayName } = auth.currentUser;

    await messagesRef.add({
      text: text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      username: displayName,
      uid,
      photoURL,
      isDeleted: false,
      fontSize: fontSize,
    });

    dummy.current.scrollIntoView({ behavior: "smooth" });
  };

  const closeMenus = () => {
    setMenuOpen(false);
    setFontOpen(false);
    setFontSizeOpen(false);
  };

  const messagesRef = firestore.collection("messages");
  const bannedUsersRef = firestore.collection("bannedUsers");
  const userPreferencesRef = firestore.collection("userPreferences");

  let query = messagesRef
    .orderBy("createdAt")
    .limit(25)
    .where("isDeleted", "==", false);

  const [messages] = useCollectionData(query, { idField: "id" });

  console.log("RE-RENDER");

  useEffect(() => {
    // getProviders();

    // Fetch the current user's ID from Firebase Authentication.
    uid = firebase.auth().currentUser.uid;
    userPreferencesRef
      .doc(uid)
      .get()
      .then((doc) => {
        if (doc.exists) {
          const preferences = doc.data();
          setFontSize(preferences.fontSize);
        }
      });

    presence(setIsOnline);

    firebase
      .firestore()
      .collection("userPresences")
      .where("isOnline", "==", true)
      .onSnapshot(function (snapshot) {
        setOnlineUsers(
          snapshot.docs.map((doc) => {
            return doc.data();
          })
        );
      });

    if (!idToken) {
      auth.currentUser.getIdTokenResult().then((idTokenResult) => {
        setIdToken(idTokenResult);
      });
    }
  }, []);

  useEffect(() => {
    if (!selection) return;
    const { start, end } = selection;
    messageInput.focus();
    messageInput.setSelectionRange(start, end);
  }, [selection]);

  return (
    <section className={styles["chat-section"]} onClickCapture={closeMenus}>
      <section className={styles["messages-section"]}>
        <span ref={dummy}></span>
        {messages &&
          messages.reverse().map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onClick={(targetUsername) => {
                setMessageValue(messageValue + " @" + targetUsername + " ");
                messageInput.focus();
              }}
              idToken={idToken}
              messagesRef={messagesRef}
              bannedUsersRef={bannedUsersRef}
            />
          ))}
      </section>

      {isFormatOpen ? (
        <div className={styles["format-controls"]}>
          <span>
            <CloseIcon />
          </span>
          <span
            onClickCapture={() => {
              setFontOpen(!isFontOpen);
            }}
          >
            T<ArrowDropDownIcon className={styles["down-arrow"]} />
            {isFontOpen ? (
              <div className={styles["menu"]}>
                <div
                  onClick={() => {
                    auth.signOut();
                  }}
                >
                  Log out
                </div>
              </div>
            ) : (
              ""
            )}
          </span>
          <span
            onClickCapture={() => {
              setFontSizeOpen(!isFontSizeOpen);
            }}
          >
            {fontSize}
            <ArrowDropDownIcon className={styles["down-arrow"]} />
            {isFontSizeOpen ? (
              <div className={styles["menu"]}>
                {[...Array(14).keys()].map((element) => {
                  return (
                    <div
                      onClickCapture={(e) => {
                        userPreferencesRef
                          .doc(uid)
                          .set({ fontSize: 9 + element })
                          .then(() => {
                            setFontSize(9 + element);
                          });
                      }}
                    >
                      {9 + element}
                    </div>
                  );
                })}
              </div>
            ) : (
              ""
            )}
          </span>
          <strong
            onClick={() => {
              let result = toggleSelectionMarkup(
                messageInput,
                MARKUP_SYMBOLS.BOLD
              );

              setMessageValue(result.value);
              setSelection({
                start: result.start,
                end: result.end,
              });
            }}
          >
            B
          </strong>
          <em
            onClick={() => {
              let result = toggleSelectionMarkup(
                messageInput,
                MARKUP_SYMBOLS.ITALICS
              );

              setMessageValue(result.value);
              setSelection({
                start: result.start,
                end: result.end,
              });
            }}
          >
            i
          </em>
          <span>bg</span>
          <span>
            <FormatColorTextIcon className={styles["font-color"]} />
          </span>
        </div>
      ) : (
        ""
      )}

      <form onSubmit={sendMessage}>
        <textarea
          ref={(input) => {
            messageInput = input;
          }}
          autoFocus
          value={messageValue}
          onChange={(e) => setMessageValue(e.target.value)}
          placeholder="Type here to send a message"
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.target.form.dispatchEvent(
                new Event("submit", {
                  cancelable: true,
                  // BUGFIX: https://github.com/final-form/react-final-form/issues/878#issuecomment-745364350
                  bubbles: true,
                })
              );
              e.preventDefault();
            }
          }}
        ></textarea>
        <TextFormatIcon
          className={
            styles["button"] + " " + (isFormatOpen ? styles["outlined"] : "")
          }
          onClick={(e) => {
            setFormatOpen(!isFormatOpen);
          }}
        />
      </form>

      <div className={styles["chat-controls"]}>
        <span
          className={styles["button"]}
          onClick={() => {
            setUsersOpen(!isUsersOpen);
          }}
        >
          {onlineUsers ? onlineUsers.length : 1}
        </span>

        <MenuIcon
          className={styles["button"]}
          onClickCapture={() => {
            setMenuOpen(!isMenuOpen);
          }}
        />

        {isMenuOpen ? (
          <div className={styles["menu"]}>
            <div
              onClick={() => {
                auth.signOut();
              }}
            >
              Log out
            </div>
          </div>
        ) : (
          ""
        )}
      </div>

      {isUsersOpen ? (
        <div className={styles["online-users"]}>
          People here now
          <ul>
            {onlineUsers.map((user) => {
              return <li>{user.username}</li>;
            })}
          </ul>
        </div>
      ) : (
        ""
      )}

      {!isOnline ? (
        <div className={styles["chat-room-overlay"]}>
          <div className={styles["overlay-message"]}>
            <div>Connection failed.</div>
            <div>Reconnecting...</div>
          </div>
        </div>
      ) : (
        ""
      )}
    </section>
  );
}
