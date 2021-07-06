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
import { ChatMessage } from "./chat-message";

let uid = null;

export function ChatRoom(props) {
  const [isOnline, setIsOnline] = useState(true);
  const [formValue, setFormValue] = useState("");
  const [idToken, setIdToken] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [fontSize, setFontSize] = useState(13);

  const [isUsersOpen, setUsersOpen] = useState(false);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isFormatOpen, setFormatOpen] = useState(false);

  const dummy = useRef();

  let messageInput;

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = formValue;
    setFormValue("");

    const { uid, photoURL, displayName } = auth.currentUser;

    await messagesRef.add({
      text: text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      username: displayName,
      uid,
      photoURL,
      isDeleted: false,
    });

    dummy.current.scrollIntoView({ behavior: "smooth" });
  };
  const messagesRef = firestore.collection("messages");
  let bannedUsersRef;

  let query = messagesRef
    .orderBy("createdAt")
    .limit(25)
    .where("isDeleted", "==", false);

  const [messages] = useCollectionData(query, { idField: "id" });

  console.log("RE-RENDER");

  useEffect(() => {
    console.log("USE EFFECT");
    // const userPresencesRef = firestore.collection("userPresences");
    bannedUsersRef = firestore.collection("bannedUsers");

    // Fetch the current user's ID from Firebase Authentication.
    uid = firebase.auth().currentUser.uid;

    presence(setIsOnline);

    // query = userPresencesRef
    //   .where(firebase.firestore.FieldPath.documentId(), "!=", uid)
    //   .where("isOnline", "==", true);
    // const [userPresences] = useCollectionData(query, { idField: "uid" });

    firebase
      .firestore()
      .collection("userPresences")
      // .where(firebase.firestore.FieldPath.documentId(), "!=", uid)
      .where("isOnline", "==", true)
      .onSnapshot(function (snapshot) {
        setOnlineUsers(
          snapshot.docs.map((doc) => {
            return doc.data();
          })
        );

        // snapshot.docChanges().forEach(function (change) {
        //   if (change.type === "added") {
        //     var msg = "User " + change.doc.id + " is online.";
        //     console.log(msg);
        //     // ...
        //   }
        //   if (change.type === "removed") {
        //     var msg = "User " + change.doc.id + " is offline.";
        //     console.log(msg);
        //     // ...
        //   }
        // });
      });

    messageInput = null;

    if (!idToken) {
      auth.currentUser.getIdTokenResult().then((idTokenResult) => {
        setIdToken(idTokenResult);
      });
    }
  }, []);

  return (
    <>
      <div className={styles["chat-room"]}>
        <span ref={dummy}></span>
        {messages &&
          messages.reverse().map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onClick={(targetUsername) => {
                setFormValue(formValue + " @" + targetUsername + " ");
                messageInput.focus();
              }}
              idToken={idToken}
              messagesRef={messagesRef}
              bannedUsersRef={bannedUsersRef}
            />
          ))}
      </div>

      {isFormatOpen ? (
        <div className={styles["format-controls"]}>
          <span>
            <CloseIcon />
          </span>
          <span>
            T<ArrowDropDownIcon className={styles["down-arrow"]} />
          </span>
          <span>
            {fontSize}
            <ArrowDropDownIcon className={styles["down-arrow"]} />
          </span>
          <strong>B</strong>
          <em>i</em>
          <u>U</u>
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
          value={formValue}
          onChange={(e) => setFormValue(e.target.value)}
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
          onClick={() => {
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
          onClick={() => {
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
    </>
  );
}
