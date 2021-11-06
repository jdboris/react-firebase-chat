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

  if (uid) {
    subscribe(uid);
  }

  const unsubToken = firebase.auth().onIdTokenChanged(function (user) {
    // If the user is now logged out
    if (!user) {
      userPresenceDatabaseRef.set(isOfflineForDatabase);

      unsubscribe();
      uid = null;

      // Assume this is a login
    } else if (uid == null) {
      uid = user.uid;
      subscribe(uid);
    }
  });

  // Add all the listeners
  function subscribe(uid) {
    // Create a reference to this user's specific status node.
    // This is where we will store data about being online/offline.
    userPresenceDatabaseRef = firebase.database().ref("/userPresences/" + uid);

    userPresenceRef = firebase.firestore().doc("/userPresences/" + uid);

    firebase
      .database()
      .ref(".info/connected")
      .on("value", function (snapshot) {
        if (snapshot.val() === false) {
          // Instead of simply returning, we'll also set Firestore's state
          // to 'offline'. This ensures that our Firestore cache is aware
          // of the switch to 'offline.'

          userPresenceRef.set(isOfflineForFirestore);
          return;
        }

        disconnectRef = userPresenceDatabaseRef.onDisconnect();
        disconnectRef.set(isOfflineForDatabase).then(function (temp) {
          userPresenceDatabaseRef.set(isOnlineForDatabase);

          // We'll also add Firestore set here for when we come online.
          userPresenceRef.set(isOnlineForFirestore);
        });
      });

    unsubPresence = userPresenceRef.onSnapshot(function (doc) {
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
  }

  // Remove all the listeners
  function unsubscribe() {
    if (disconnectRef) disconnectRef.cancel();
    firebase.database().ref(".info/connected").off("value");
    if (unsubPresence) unsubPresence();
    if (unsubToken) unsubToken();
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

  return unsubscribe;
}