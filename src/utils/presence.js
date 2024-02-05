import { getAuth, getIdTokenResult } from "firebase/auth";
import {
  serverTimestamp as dbServerTimestamp,
  getDatabase,
  goOnline,
  off,
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  set,
} from "firebase/database";
import {
  deleteDoc,
  doc,
  serverTimestamp as firestoreServerTimestamp,
  getFirestore,
  onSnapshot,
  setDoc,
} from "firebase/firestore";

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
    lastChanged: dbServerTimestamp(),
    username,
  };

  const isOnlineForDatabase = {
    isOnline: true,
    lastChanged: dbServerTimestamp(),
    username,
  };

  const isOfflineForFirestore = {
    isOnline: false,
    lastChanged: firestoreServerTimestamp(),
    username,
  };

  const isOnlineForFirestore = {
    isOnline: true,
    lastChanged: firestoreServerTimestamp(),
    username,
  };

  subscribe();
  goOnline(getDatabase());

  function startPeriodicUpdate() {
    // Clear the old one
    stopPeriodicUpdate();

    // Periodically refresh online status
    refreshIntervalId = setInterval(() => {
      set(ref(getDatabase(), `/userPresences/${uid}`), isOnlineForDatabase);

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
        const user = getAuth().currentUser;

        const token = user
          ? await getIdTokenResult(getAuth().currentUser, true)
          : null;

        const expirationTime = token ? Date.parse(token.expirationTime) : null;
        const now = Date.now();

        // LOGGED IN?
        if (expirationTime) {
          // Set online with current timestamp in case connection is lost after token expires
          set(ref(getDatabase(), `/userPresences/${uid}`), isOnlineForDatabase);

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

            await remove(ref(getDatabase(), `/userPresences/${uid}`));

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
          await remove(ref(getDatabase(), `/userPresences/${uid}`));
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
        deleteDoc(doc(getFirestore(), "userPresences", uid));

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

        disconnectRef = onDisconnect(
          ref(getDatabase(), `/userPresences/${uid}`)
        );

        // REALTIME DB: OFFLINE
        await disconnectRef.remove();

        // REALTIME DB: ONLINE
        set(ref(getDatabase(), `/userPresences/${uid}`), isOnlineForDatabase);

        // FIRESTORE: ONLINE
        setDoc(doc(getFirestore(), "userPresences", uid), isOnlineForFirestore);
      }
    }
  }

  // Add all the listeners
  function subscribe() {
    isSubscribed = true;

    window.addEventListener("blur", onWindowFocusChange);
    window.addEventListener("focus", onWindowFocusChange);

    connectedRef = ref(getDatabase(), ".info/connected");

    uid = uid || push(ref(getDatabase(), "/userPresences")).key;

    // CONNECTION CHANGED...
    onValue(connectedRef, onConnectedValueChanged);

    unsubPresence = onSnapshot(
      doc(getFirestore(), "userPresences", uid),
      function (doc) {
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
      }
    );
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
    off(connectedRef, "value", onConnectedValueChanged);
    if (unsubPresence) unsubPresence();
    unsubPresence = null;
    if (disconnectRef) await disconnectRef.cancel();
    disconnectRef = null;
  }

  // Disconnect without waiting for front-end listeners
  async function disconnect() {
    // NOTE: MUST get the document ref again every time to avoid BUGS
    await remove(ref(getDatabase(), `/userPresences/${uid}`));
    // await firebase.database().goOffline();
  }

  async function signalOnline() {
    if (isSubscribed) {
      // await firebase.database().goOnline();
      startPeriodicUpdate();
      // Set online with current timestamp in case connection is lost after token expires
      set(ref(getDatabase(), `/userPresences/${uid}`), isOnlineForDatabase);

      setDoc(doc(getFirestore(), "userPresences", uid), isOnlineForFirestore);
    }
  }

  return { uid, username, unsubscribe, disconnect, signalOnline };
}
