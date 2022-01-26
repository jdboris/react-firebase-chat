import firebase from "firebase/compat/app";
import "firebase/compat/database";

export function presence(uid, username, setIsOnline) {
  console.log("presence uid: " + uid);
  console.log("presence username: " + username);
  // NOTE: This flag is necessary to prevent additional db updates
  //       while the asyncronous unsubscribing is in progress.
  let isSubscribed = false;
  // let offlineTimeout = null;
  // let reconnectCountdown = null;
  let disconnectRef = null;
  let unsubPresence = null;
  let userPresenceDatabaseRef = null;
  let userPresenceRef = null;
  let connectedRef = null; // A function for setting user connected status base on the window visibility
  let isConnectedTimeout = null;
  let messageTimeout = null;

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

  // NOTE: Must manually disconnect before user's auth token expires,
  //       or onDisconnect() handler will never trigger.
  // Sources:
  // https://github.com/firebase/firebase-js-sdk/issues/174
  // https://stackoverflow.com/questions/17069672/firebase-ondisconnect-not-100-reliable-now
  async function onWindowVisibilityChange() {
    // FOCUS
    if (document.hasFocus()) {
      firebase.database().goOnline();
      clearTimeout(isConnectedTimeout);
      isConnectedTimeout = null;

      // BLUR
    } else {
      // TODO: Mark user IDLE here

      if (isConnectedTimeout === null) {
        const token = await firebase.auth().currentUser.getIdTokenResult(true);
        const expirationTime = Date.parse(token.expirationTime);
        const now = Date.now();

        isConnectedTimeout = setTimeout(() => {
          firebase.database().goOffline();
          isConnectedTimeout = null;

          //             50 minutes
          //       1 hour           10 minutes
        }, expirationTime - now - 10 * 60 * 1000);
      }
    }
  }

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
        console.error("Connection lost.");

        // FIRESTORE: OFFLINE
        userPresenceRef.set(isOfflineForFirestore);

        // if (reconnectCountdown === null) {
        //   // Wait for 10 seconds then query realtime database to refresh connection status
        //   reconnectCountdown = setTimeout(() => {
        //     signalOnline();
        //     reconnectCountdown = null;
        //   }, 5000);
        // }

        // if (offlineTimeout === null) {
        //   // Wait for 60 seconds before telling the user the connection was lost
        //   offlineTimeout = setTimeout(() => {
        //     console.error("Reconnect timed out.");

        //     // FIRESTORE: OFFLINE
        //     userPresenceRef.set(isOfflineForFirestore);
        //     offlineTimeout = null;
        //   }, 2000);
        // }

        // CONNECT DETECTED
      } else {
        // if (offlineTimeout !== null) {
        //   console.log("Reconnected!");
        //   clearTimeout(offlineTimeout);
        //   offlineTimeout = null;
        // }
        if (disconnectRef) {
          disconnectRef.cancel();
        }

        disconnectRef = userPresenceDatabaseRef.onDisconnect();
        // REALTIME DB: OFFLINE
        await disconnectRef.set(isOfflineForDatabase);

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

    // setTimeout(async () => {
    //   firebase.database().goOffline();
    //   // disconnectAndUnsubscribe();
    // }, 10000);

    window.addEventListener("focus", onWindowVisibilityChange);
    window.addEventListener("blur", onWindowVisibilityChange);

    // window.addEventListener("beforeunload", disconnectAndUnsubscribe);
    // window.addEventListener("focus", signalOnline);

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
            if (messageTimeout !== null) {
              clearTimeout(messageTimeout);
              messageTimeout = null;
            }
            setIsOnline(true);
            // DISCONNECTED?
          } else {
            console.error("Disconnection confirmed.");
            if (messageTimeout === null) {
              // Wait 5 seconds before telling the user they're disconnected
              messageTimeout = setTimeout(() => {
                setIsOnline(false);
                messageTimeout = null;
              }, 5000);
            }
          }
        }
      }
    });
  }

  // Remove all the listeners
  async function unsubscribe() {
    console.log("unsubscribe()");
    isSubscribed = false;
    // window.removeEventListener("beforeunload", disconnectAndUnsubscribe);
    window.removeEventListener("focus", onWindowVisibilityChange);
    window.removeEventListener("blur", onWindowVisibilityChange);
    // window.removeEventListener("focus", signalOnline);
    if (isConnectedTimeout !== null) {
      clearTimeout(isConnectedTimeout);
      isConnectedTimeout = null;
    }
    if (messageTimeout !== null) {
      clearTimeout(messageTimeout);
      messageTimeout = null;
    }
    // if (reconnectCountdown !== null) {
    //   clearTimeout(reconnectCountdown);
    //   reconnectCountdown = null;
    // }
    // if (offlineTimeout !== null) {
    //   clearTimeout(offlineTimeout);
    //   offlineTimeout = null;
    // }
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

  async function signalOnline() {
    console.log("SIGNALING ONLINE!");
    if (isSubscribed && userPresenceDatabaseRef) {
      await firebase.database().goOffline();
      await firebase.database().goOnline();
      // connectedRef.off("value", onConnectedValueChanged);

      // setTimeout(() => {
      //   connectedRef.on("value", onConnectedValueChanged);
      // }, 1000);
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

  return [unsubscribe, disconnect, signalOnline];
}
