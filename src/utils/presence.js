import firebase from "firebase/compat/app";
import "firebase/compat/database";

export function presence(uid, username, setIsOnline) {
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
    userPresenceRef.set(isOfflineForFirestore);
    //userPresenceRef = null;
    userPresenceDatabaseRef.set(isOfflineForDatabase);
    //userPresenceDatabaseRef = null;
  }

  function onConnectedValueChanged(snapshot) {
    if (isSubscribed) {
      // DISCONNECTED?
      if (snapshot.val() === false) {
        // Instead of simply returning, we'll also set Firestore's state
        // to 'offline'. This ensures that our Firestore cache is aware
        // of the switch to 'offline.'
        userPresenceRef.set(isOfflineForFirestore);

        // CONNECTED?
      } else {
        disconnectRef = userPresenceDatabaseRef.onDisconnect();
        disconnectRef.set(isOfflineForDatabase).then(function (temp) {
          if (isSubscribed) {
            // ONLINE
            userPresenceDatabaseRef.set(isOnlineForDatabase);

            // We'll also add Firestore set here for when we come online.
            userPresenceRef.set(isOnlineForFirestore);
          }
        });
      }
    }
  }

  // Add all the listeners
  function subscribe() {
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

    // CONNECTION CHANGED (pt. 2)...
    unsubPresence = userPresenceRef.onSnapshot(function (doc) {
      if (isSubscribed) {
        if (doc.data()) {
          const isOnline = doc.data().isOnline;

          // CONNECTED?
          if (isOnline) {
            if (offlineTimeout !== null) {
              clearTimeout(offlineTimeout);
              offlineTimeout = null;
              setIsOnline(true);
            }
            // DISCONNECTED?
          } else {
            if (offlineTimeout === null) {
              console.error("Connection lost. Attempting to reconnect...");
              connectedRef.off("value", onConnectedValueChanged);
              connectedRef.on("value", onConnectedValueChanged);

              // Wait for 5 seconds before telling the user the connection was lost
              offlineTimeout = setTimeout(() => {
                console.error("Reconnect timeout.");
                setIsOnline(false);
              }, 5000);
            }
          }
        }
      }
    });
  }

  // Remove all the listeners
  function unsubscribe() {
    isSubscribed = false;
    window.removeEventListener("beforeunload", disconnectAndUnsubscribe);
    if (offlineTimeout !== null) {
      clearTimeout(offlineTimeout);
    }
    connectedRef.off("value", onConnectedValueChanged);
    if (unsubPresence) unsubPresence();
    // if (unsubToken) unsubToken();
    if (disconnectRef) disconnectRef.cancel();
  }

  function disconnectAndUnsubscribe() {
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
