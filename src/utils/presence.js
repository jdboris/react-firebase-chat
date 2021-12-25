import firebase from "firebase/compat/app";
import "firebase/compat/database";

export function presence(uid, username, setIsOnline) {
  let offlineTimeout = null;
  let disconnectRef = null;
  let unsubPresence = null;
  let userPresenceDatabaseRef = null;
  let userPresenceRef = null;

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
  console.log("PRESENCE UID: " + typeof uid);
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
    console.log("MANUAL DISCONNECT STARTED (" + uid + ")...");
    userPresenceRef.set(isOfflineForFirestore);
    userPresenceDatabaseRef.set(isOfflineForDatabase);
  }

  // Add all the listeners
  function subscribe() {
    // Create a reference to this user's specific status node.
    // This is where we will store data about being online/offline.
    userPresenceDatabaseRef = uid
      ? firebase.database().ref(`/userPresences/${uid}`)
      : firebase.database().ref("/userPresences").push();

    uid = userPresenceDatabaseRef.key;

    console.log("uid: ", uid);
    userPresenceRef = firebase.firestore().collection("userPresences").doc(uid);

    firebase
      .database()
      .ref(".info/connected")
      // CONNECTION CHANGED...
      .on("value", function (snapshot) {
        // DISCONNECTED?
        if (snapshot.val() === false) {
          // Instead of simply returning, we'll also set Firestore's state
          // to 'offline'. This ensures that our Firestore cache is aware
          // of the switch to 'offline.'
          userPresenceRef.set(isOfflineForFirestore);

          // CONNECTED?
        } else {
          console.log("REATIME DATABASE CONNECTED!");
          disconnectRef = userPresenceDatabaseRef.onDisconnect();
          disconnectRef.set(isOfflineForDatabase).then(function (temp) {
            // ONLINE
            console.log("REATIME DATABASE CONNECTED (2)!");
            userPresenceDatabaseRef.set(isOnlineForDatabase);

            // We'll also add Firestore set here for when we come online.
            userPresenceRef.set(isOnlineForFirestore);
          });
        }
      });

    // CONNECTION CHANGED (pt. 2)...
    unsubPresence = userPresenceRef.onSnapshot(function (doc) {
      if (doc.data()) {
        let isOnline = doc.data().isOnline;

        // CONNECTED?
        if (isOnline) {
          console.log("FIRESTORE CONNECTED(" + uid + ")!");
          if (offlineTimeout !== null) {
            clearTimeout(offlineTimeout);
            offlineTimeout = null;
            setIsOnline(true);
          }
          // DISCONNECTED?
        } else {
          console.log("FIRESTORE DISCONNECTED(" + uid + ")!");
          if (offlineTimeout === null) {
            // Wait for 3 seconds before telling the user the connection was lost
            offlineTimeout = setTimeout(() => {
              setIsOnline(false);
            }, 3000);
          }
        }
      }
    });
  }

  // Remove all the listeners
  function unsubscribe() {
    firebase.database().ref(".info/connected").off("value");
    if (unsubPresence) unsubPresence();
    // if (unsubToken) unsubToken();
    if (disconnectRef) disconnectRef.cancel();
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
