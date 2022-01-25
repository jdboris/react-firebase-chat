import firebase from "firebase/compat/app";
import "firebase/compat/database";

export function presence(uid, username, setIsOnline) {
  console.log("presence uid: " + uid);
  console.log("presence username: " + username);
  // NOTE: This flag is necessary to prevent additional db updates
  //       while the asyncronous unsubscribing is in progress.
  let isSubscribed = false;
  let offlineTimeout = null;
  let disconnectRef = null;
  let unsubPresence = null;
  let userPresenceDatabaseRef = null;
  let userPresenceRef = null;
  let connectedRef = null;

  const isOfflineForDatabase = {
    isOnline: false,
    lastChanged: firebase.database.ServerValue.TIMESTAMP,
    username,
  };

  const isOnlineForDatabase = {
    isOnline: true,
    lastChanged: firebase.database.ServerValue.TIMESTAMP,
    username,
  };

  const isOfflineForFirestore = {
    isOnline: false,
    lastChanged: firebase.firestore.FieldValue.serverTimestamp(),
    username,
  };

  const isOnlineForFirestore = {
    isOnline: true,
    lastChanged: firebase.firestore.FieldValue.serverTimestamp(),
    username,
  };

  subscribe();

  // const unsubToken = firebase.auth().onIdTokenChanged(function (user) {
  //   // If the user is now logged out
  //   if (!user) {
  //     userPresenceDatabaseRef.set(isOfflineForDatabase);

  //     unsubscribe();
  //     uid = null;

  //     // Assume this is a login
  //   } else if (uid == null) {
  //     uid = user.uid;
  //     subscribe(uid);
  //   }
  // });

  function disconnect() {
    console.log("disconnect()");
    userPresenceRef.set(isOfflineForFirestore);
    userPresenceDatabaseRef.set(isOfflineForDatabase);
  }

  async function onConnectedValueChanged(snapshot) {
    console.log("onConnectedValueChanged()");
    if (isSubscribed) {
      // DISCONNECT DETECTED
      if (snapshot.val() === false) {
        console.error("Connection lost. Attempting to reconnect...");
        if (offlineTimeout === null) {
          // Wait for 60 seconds before telling the user the connection was lost
          offlineTimeout = setTimeout(() => {
            console.error("Reconnect timed out.");

            // FIRESTORE: OFFLINE
            userPresenceRef.set(isOfflineForFirestore);
          }, 60000);
        }

        // CONNECT DETECTED
      } else {
        if (offlineTimeout !== null) {
          console.log("Reconnected!");
          clearTimeout(offlineTimeout);
          offlineTimeout = null;
        }
        if (!disconnectRef) {
          disconnectRef = userPresenceDatabaseRef.onDisconnect();
          // REALTIME DB: OFFLINE
          await disconnectRef.set(isOfflineForDatabase);
        }
        console.log("SETTING ONLINE...");
        // REALTIME DB: ONLINE
        userPresenceDatabaseRef.set(isOnlineForDatabase);
        // FIRESTORE: ONLINE
        userPresenceRef.set(isOnlineForFirestore);
      }
    }
  }

  // Add all the listeners
  function subscribe() {
    console.log("subscribe()");
    isSubscribed = true;
    window.addEventListener("beforeunload", disconnectAndUnsubscribe);

    connectedRef = firebase.database().ref(".info/connected");

    // Create a reference to this user's specific status node.
    // This is where we will store data about being online/offline.
    userPresenceDatabaseRef = uid
      ? firebase.database().ref(`/userPresences/${uid}`)
      : firebase.database().ref("/userPresences").push();

    uid = userPresenceDatabaseRef.key;

    userPresenceRef = firebase.firestore().collection("userPresences").doc(uid);

    connectedRef
      // CONNECTION CHANGED...
      .on("value", onConnectedValueChanged);

    unsubPresence = userPresenceRef.onSnapshot(function (doc) {
      console.log("userPresenceRef.onSnapshot()");
      if (isSubscribed) {
        if (doc.data()) {
          const isOnline = doc.data().isOnline;

          // CONNECTED?
          if (isOnline) {
            console.log("Connection confirmed.");
            setIsOnline(true);
            // DISCONNECTED?
          } else {
            console.error("Disconnection confirmed.");
            setIsOnline(false);
          }
        }
      }
    });
  }

  // Remove all the listeners
  async function unsubscribe() {
    console.log("unsubscribe()");
    isSubscribed = false;
    window.removeEventListener("beforeunload", disconnectAndUnsubscribe);
    if (offlineTimeout !== null) {
      clearTimeout(offlineTimeout);
    }
    connectedRef.off("value", onConnectedValueChanged);
    if (unsubPresence) unsubPresence();
    // if (unsubToken) unsubToken();
    if (disconnectRef) await disconnectRef.cancel();
  }

  function disconnectAndUnsubscribe() {
    console.log("disconnectAndUnsubscribe()");
    if (isSubscribed) {
      unsubscribe();
      disconnect();
    }
  }

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

  return [unsubscribe, disconnect];
}
