import firebase from "firebase/compat/app";
import "firebase/compat/database";

export function startPresence(uid, username, setIsOnline) {
  // NOTE: This flag is necessary to prevent additional db updates
  //       while the asyncronous unsubscribing is in progress.
  let isSubscribed = false;
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
  firebase.database().goOnline();

  // NOTE: Must manually disconnect before user's auth token expires,
  //       or onDisconnect() handler will never trigger.
  // Sources:
  // https://github.com/firebase/firebase-js-sdk/issues/174
  // https://stackoverflow.com/questions/17069672/firebase-ondisconnect-not-100-reliable-now
  async function onWindowVisibilityChange() {
    // FOCUS
    if (document.visibilityState === "visible") {
      signalOnline();

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
          //         1 hour         10 minutes
        }, expirationTime - now - 10 * 60 * 1000);
      }
    }
  }

  async function onConnectedValueChanged(snapshot) {
    console.log("onConnectedValueChanged()");
    if (isSubscribed) {
      // DISCONNECT DETECTED
      if (snapshot.val() === false) {
        console.error("Connection lost.");

        // FIRESTORE: OFFLINE
        userPresenceRef.set(isOfflineForFirestore);

        // CONNECT DETECTED
      } else {
        if (isConnectedTimeout !== null) {
          clearTimeout(isConnectedTimeout);
          isConnectedTimeout = null;
        }

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
    console.log("SUBSCRIBING WITH...");

    console.log("presence uid: " + uid);
    console.log("presence username: " + username);

    isSubscribed = true;

    document.addEventListener("visibilitychange", onWindowVisibilityChange);

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
    document.removeEventListener("visibilitychange", onWindowVisibilityChange);
    if (isConnectedTimeout !== null) {
      clearTimeout(isConnectedTimeout);
      isConnectedTimeout = null;
    }
    if (messageTimeout !== null) {
      clearTimeout(messageTimeout);
      messageTimeout = null;
    }
    connectedRef.off("value", onConnectedValueChanged);
    if (unsubPresence) unsubPresence();
    if (disconnectRef) await disconnectRef.cancel();
  }

  // Disconnect without waiting for listeners
  async function disconnect() {
    console.log("disconnect()");

    await userPresenceRef.set(isOfflineForFirestore);
    await userPresenceDatabaseRef.set(isOfflineForDatabase);
    await firebase.database().goOffline();
  }

  async function signalOnline() {
    if (isSubscribed && userPresenceDatabaseRef) {
      await firebase.database().goOffline();
      await firebase.database().goOnline();
    }
  }

  return { unsubscribe, disconnect, signalOnline };
}
