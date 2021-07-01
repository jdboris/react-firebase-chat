import React, { useRef, useState, useEffect } from "react";
import styles from "../css/chat-room.module.css";
import MenuIcon from "@material-ui/icons/Menu";

import firebase from "firebase/app";
import "firebase/database";

import { useCollectionData } from "react-firebase-hooks/firestore";

import { firestore, auth } from "../app";

let uid = null;

function presence(setIsOnline) {
  let { displayName } = auth.currentUser;
  let offlineTimeout = null;

  // Create a reference to this user's specific status node.
  // This is where we will store data about being online/offline.
  const userPresenceDatabaseRef = firebase
    .database()
    .ref("/userPresences/" + uid);

  // We'll create two constants which we will write to
  // the Realtime database when this device is offline
  // or online.
  let isOfflineForDatabase = {
    isOnline: false,
    lastChanged: firebase.database.ServerValue.TIMESTAMP,
    username: displayName,
  };

  let isOnlineForDatabase = {
    isOnline: true,
    lastChanged: firebase.database.ServerValue.TIMESTAMP,
    username: displayName,
  };

  const userPresenceRef = firebase.firestore().doc("/userPresences/" + uid);

  // Firestore uses a different server timestamp value, so we'll
  // create two more constants for Firestore state.
  let isOfflineForFirestore = {
    isOnline: false,
    lastChanged: firebase.firestore.FieldValue.serverTimestamp(),
    username: displayName,
  };

  let isOnlineForFirestore = {
    isOnline: true,
    lastChanged: firebase.firestore.FieldValue.serverTimestamp(),
    username: displayName,
  };

  firebase
    .database()
    .ref(".info/connected")
    .on("value", function (snapshot) {
      if (snapshot.val() == false) {
        // Instead of simply returning, we'll also set Firestore's state
        // to 'offline'. This ensures that our Firestore cache is aware
        // of the switch to 'offline.'

        userPresenceRef.set(isOfflineForFirestore);
        return;
      }

      userPresenceDatabaseRef
        .onDisconnect()
        .set(isOfflineForDatabase)
        .then(function () {
          userPresenceDatabaseRef.set(isOnlineForDatabase);

          // We'll also add Firestore set here for when we come online.
          userPresenceRef.set(isOnlineForFirestore);
        });
    });

  userPresenceRef.onSnapshot(function (doc) {
    if (doc.data()) {
      let isOnline = doc.data().isOnline;

      if (isOnline) {
        if (offlineTimeout !== null) {
          clearTimeout(offlineTimeout);
          offlineTimeout = null;
          setIsOnline(true);
        }
      } else {
        if (offlineTimeout === null) {
          // Wait for 3 seconds before telling the user the connection was lost
          offlineTimeout = setTimeout(() => {
            setIsOnline(false);
          }, 3000);
        }
      }
    }
  });

  firebase.auth().onIdTokenChanged(function (user) {
    // If the user is now logged out
    if (!user) {
      userPresenceDatabaseRef.set(isOfflineForDatabase);
    }
  });
}

export function ChatRoom(props) {
  const [isOnline, setIsOnline] = useState(true);
  const [formValue, setFormValue] = useState("");
  const [idToken, setIdToken] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [usersVisible, setUsersVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

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

    let oldUid = uid;
    // Fetch the current user's ID from Firebase Authentication.
    uid = firebase.auth().currentUser.uid;

    if (!oldUid && uid) {
      presence(setIsOnline);
    }

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
      </form>

      <div className={styles["chat-controls"]}>
        <span
          className={styles["button"]}
          onClick={() => {
            setUsersVisible(!usersVisible);
          }}
        >
          {onlineUsers ? onlineUsers.length : 1}
        </span>

        <MenuIcon
          className={styles["button"]}
          onClick={() => {
            setMenuVisible(!menuVisible);
          }}
        />

        {menuVisible ? (
          <div class={styles["menu"]}>
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

      {usersVisible ? (
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

function ChatMessage(props) {
  let { text, uid, photoURL, createdAt, username } = props.message;
  let { claims } = props.idToken;
  const messageClass = uid === auth.currentUser.uid ? "sent" : "received";

  let mouseDownSpot = null;

  const doesMentionCurrentUser = text.includes(
    `@${auth.currentUser.displayName} `
  );

  let parts = text.split(`@${auth.currentUser.displayName} `);
  let message = [parts[0]];

  function banUser() {
    props.bannedUsersRef.doc(props.message.uid).set({});
  }

  function deleteMessage() {
    props.messagesRef.doc(props.message.id).update({ isDeleted: true });
  }

  for (let i = 1; i < parts.length; i++) {
    message.push(<strong>@{auth.currentUser.displayName} </strong>);
    message.push(parts[i]);
  }

  return (
    <>
      <div
        className={
          styles["message"] +
          " " +
          styles[messageClass] +
          " " +
          (doesMentionCurrentUser ? styles["mention"] : "")
        }
        onMouseDown={(e) => {
          mouseDownSpot = { x: e.pageX, y: e.pageY };
        }}
        onMouseUp={(e) => {
          // Left click
          if (e.button == 0 && mouseDownSpot) {
            let a = mouseDownSpot.x - e.pageX;
            let b = mouseDownSpot.y - e.pageY;

            let distance = Math.sqrt(a * a + b * b);

            if (distance <= 2) {
              props.onClick(username);
              mouseDownSpot = null;
            }
          }
        }}
      >
        <img src={photoURL || "https://i.imgur.com/h2yCi23.jpg"} />
        <span className={styles["message-details"]}>
          {claims.isModerator ? <button onClick={banUser}>X</button> : ""}
          {claims.isModerator ? <button onClick={deleteMessage}>X</button> : ""}
          <span className={styles["message-timestamp"]}>
            {createdAt && createdAt.toDate().toLocaleString()}
          </span>
        </span>
        <p>
          <span className={styles["message-username"]}>{username}</span>:{" "}
          {message}
        </p>
      </div>
    </>
  );
}
