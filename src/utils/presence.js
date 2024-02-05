import firebase from "firebase/compat/app";
import "firebase/compat/database";

export function startPresence(uid, username, setIsOnline) {
  // NOTE: This flag is necessary to prevent additional db updates
  //       while the asyncronous unsubscribing is in progress.
  let isSubscribed = false;
  let disconnectRef = null;
  let unsubPresence = null;
  let connectedRef = null; // A function for setting user connected status base on the window visibility
  let isConnectedTimeout = null;
  let messageTimeout = null;
  let refreshIntervalId = null;

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

  function startPeriodicUpdate() {
    // Clear the old one
    stopPeriodicUpdate();

    // Periodically refresh online status
    refreshIntervalId = setInterval(() => {
      firebase.database().ref(`/userPresences/${uid}`).set(isOnlineForDatabase);

      // 50 minutes
    }, 1000 * 60 * 50);
  }

  function stopPeriodicUpdate() {
    if (refreshIntervalId !== null) {
      clearInterval(refreshIntervalId);
      refreshIntervalId = null;
    }
  }

  // NOTE: Must manually disconnect before user's auth token expires,
  //       or onDisconnect() handler will never trigger.
  // Sources:
  // https://github.com/firebase/firebase-js-sdk/issues/174
  // https://stackoverflow.com/questions/17069672/firebase-ondisconnect-not-100-reliable-now
  async function onWindowFocusChange() {
    // FOCUS
    if (document.hasFocus()) {
      signalOnline();

      // BLUR
    } else {
      stopPeriodicUpdate();

      // firebase
      //   .firestore()
      //   .doc(
      //     `debugLog/${username}:${uid}/log/${Date.now()}:${
      //       Math.random() * 99999999
      //     }`
      //   )
      //   .set(
      //     {
      //       clientTime: new Date(),
      //       serverTime: firebase.firestore.FieldValue.serverTimestamp(),
      //       action: `Window lost focus. ${
      //         isConnectedTimeout === null
      //           ? "Starting IDLE countdown."
      //           : "IDLE countdown already started, doing nothing."
      //       }`,
      //     },
      //     { merge: true }
      //   );

      if (isConnectedTimeout === null) {
        const user = firebase.auth().currentUser;
        const token = user ? await user.getIdTokenResult(true) : null;

        const expirationTime = token ? Date.parse(token.expirationTime) : null;
        const now = Date.now();

        // LOGGED IN?
        if (expirationTime) {
          // Set online with current timestamp in case connection is lost after token expires
          firebase
            .database()
            .ref(`/userPresences/${uid}`)
            .set(isOnlineForDatabase);

          isConnectedTimeout = setTimeout(async () => {
            // firebase
            //   .firestore()
            //   .doc(
            //     `debugLog/${username}:${uid}/log/${Date.now()}:${
            //       Math.random() * 99999999
            //     }`
            //   )
            //   .set(
            //     {
            //       clientTime: new Date(),
            //       serverTime: firebase.firestore.FieldValue.serverTimestamp(),
            //       action: `IDLE countdown finished.`,
            //     },
            //     { merge: true }
            //   );

            // firebase.database().goOffline();
            await firebase.database().ref(`/userPresences/${uid}`).remove();

            isConnectedTimeout = null;

            //             50 minutes
            //         1 hour         10 minutes
          }, expirationTime - now - 10 * 60 * 1000);

          // ANON?
        } else {
          // firebase
          //   .firestore()
          //   .doc(
          //     `debugLog/${username}:${uid}/log/${Date.now()}:${
          //       Math.random() * 99999999
          //     }`
          //   )
          //   .set(
          //     {
          //       clientTime: new Date(),
          //       serverTime: firebase.firestore.FieldValue.serverTimestamp(),
          //       action: `IDLE countdown finished.`,
          //     },
          //     { merge: true }
          //   );

          // firebase.database().goOffline();
          await firebase.database().ref(`/userPresences/${uid}`).remove();
        }
      }
    }
  }

  async function onConnectedValueChanged(snapshot) {
    if (isSubscribed) {
      // DISCONNECT DETECTED
      if (snapshot.val() === false) {
        // firebase
        //   .firestore()
        //   .doc(
        //     `debugLog/${username}:${uid}/log/${Date.now()}:${
        //       Math.random() * 99999999
        //     }`
        //   )
        //   .set(
        //     {
        //       clientTime: new Date(),
        //       serverTime: firebase.firestore.FieldValue.serverTimestamp(),
        //       action: `Disconnect detected, updating database...`,
        //     },
        //     { merge: true }
        //   );

        // FIRESTORE: OFFLINE
        firebase.firestore().collection("userPresences").doc(uid).delete();

        // CONNECT DETECTED
      } else {
        // firebase
        //   .firestore()
        //   .doc(
        //     `debugLog/${username}:${uid}/log/${Date.now()}:${
        //       Math.random() * 99999999
        //     }`
        //   )
        //   .set(
        //     {
        //       clientTime: new Date(),
        //       serverTime: firebase.firestore.FieldValue.serverTimestamp(),
        //       action: `Connection detected, updating database...`,
        //     },
        //     { merge: true }
        //   );

        startPeriodicUpdate();

        if (isConnectedTimeout !== null) {
          clearTimeout(isConnectedTimeout);
          isConnectedTimeout = null;
        }

        if (disconnectRef) {
          disconnectRef.cancel();
        }

        disconnectRef = firebase
          .database()
          .ref(`/userPresences/${uid}`)
          .onDisconnect();

        // REALTIME DB: OFFLINE
        await disconnectRef.remove();

        // REALTIME DB: ONLINE
        firebase
          .database()
          .ref(`/userPresences/${uid}`)
          .set(isOnlineForDatabase);
        // FIRESTORE: ONLINE
        firebase
          .firestore()
          .collection("userPresences")
          .doc(uid)
          .set(isOnlineForFirestore);
      }
    }
  }

  // Add all the listeners
  function subscribe() {
    isSubscribed = true;

    window.addEventListener("blur", onWindowFocusChange);
    window.addEventListener("focus", onWindowFocusChange);

    connectedRef = firebase.database().ref(".info/connected");

    uid = uid || firebase.database().ref("/userPresences").push().key;

    connectedRef
      // CONNECTION CHANGED...
      .on("value", onConnectedValueChanged);

    unsubPresence = firebase
      .firestore()
      .collection("userPresences")
      .doc(uid)
      .onSnapshot(function (doc) {
        if (isSubscribed) {
          if (doc.data()) {
            const isOnline = doc.data().isOnline;

            // CONNECTED?
            if (isOnline) {
              if (messageTimeout !== null) {
                clearTimeout(messageTimeout);
                messageTimeout = null;
              }
              setIsOnline(true);
              // DISCONNECTED?
            } else {
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
    isSubscribed = false;

    window.removeEventListener("blur", onWindowFocusChange);
    window.removeEventListener("focus", onWindowFocusChange);

    stopPeriodicUpdate();

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
    unsubPresence = null;
    if (disconnectRef) await disconnectRef.cancel();
    disconnectRef = null;
  }

  // Disconnect without waiting for front-end listeners
  async function disconnect() {
    // NOTE: MUST get the document ref again every time to avoid BUGS
    await firebase.database().ref(`/userPresences/${uid}`).remove();
    // await firebase.database().goOffline();
  }

  async function signalOnline() {
    if (isSubscribed) {
      // await firebase.database().goOnline();
      startPeriodicUpdate();
      // Set online with current timestamp in case connection is lost after token expires
      await firebase
        .database()
        .ref(`/userPresences/${uid}`)
        .set(isOnlineForDatabase);
      await firebase
        .firestore()
        .collection("userPresences")
        .doc(uid)
        .set(isOnlineForFirestore);
    }
  }

  return { uid, username, unsubscribe, disconnect, signalOnline };
}
