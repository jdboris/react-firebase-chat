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
      if (refreshIntervalId !== null) {
        clearInterval(refreshIntervalId);
        refreshIntervalId = null;
      }

      // Set online with current timestamp in case connection is lost after token expires
      userPresenceRef.set(isOnlineForFirestore);

      firebase
        .firestore()
        .doc(
          `debugLog/${username}:${uid}/log/${Date.now()}:${
            Math.random() * 99999999
          }`
        )
        .set(
          {
            clientTime: new Date(),
            serverTime: firebase.firestore.FieldValue.serverTimestamp(),
            action: `Window lost focus. ${
              isConnectedTimeout === null
                ? "Starting IDLE countdown."
                : "IDLE countdown already started, doing nothing."
            }`,
          },
          { merge: true }
        );

      if (isConnectedTimeout === null) {
        const user = firebase.auth().currentUser;
        const token = user ? await user.getIdTokenResult(true) : null;

        const expirationTime = token ? Date.parse(token.expirationTime) : null;
        const now = Date.now();

        if (expirationTime) {
          isConnectedTimeout = setTimeout(() => {
            firebase
              .firestore()
              .doc(
                `debugLog/${username}:${uid}/log/${Date.now()}:${
                  Math.random() * 99999999
                }`
              )
              .set(
                {
                  clientTime: new Date(),
                  serverTime: firebase.firestore.FieldValue.serverTimestamp(),
                  action: `IDLE countdown finished.`,
                },
                { merge: true }
              );

            firebase.database().goOffline();
            isConnectedTimeout = null;

            //             50 minutes
            //         1 hour         10 minutes
          }, expirationTime - now - 10 * 60 * 1000);
        } else {
          firebase
            .firestore()
            .doc(
              `debugLog/${username}:${uid}/log/${Date.now()}:${
                Math.random() * 99999999
              }`
            )
            .set(
              {
                clientTime: new Date(),
                serverTime: firebase.firestore.FieldValue.serverTimestamp(),
                action: `IDLE countdown finished.`,
              },
              { merge: true }
            );

          firebase.database().goOffline();
        }
      }
    }
  }

  async function onConnectedValueChanged(snapshot) {
    if (isSubscribed) {
      // DISCONNECT DETECTED
      if (snapshot.val() === false) {
        firebase
          .firestore()
          .doc(
            `debugLog/${username}:${uid}/log/${Date.now()}:${
              Math.random() * 99999999
            }`
          )
          .set(
            {
              clientTime: new Date(),
              serverTime: firebase.firestore.FieldValue.serverTimestamp(),
              action: `Disconnect detected, updating database...`,
            },
            { merge: true }
          );

        // FIRESTORE: OFFLINE
        userPresenceRef.set(isOfflineForFirestore);

        // CONNECT DETECTED
      } else {
        firebase
          .firestore()
          .doc(
            `debugLog/${username}:${uid}/log/${Date.now()}:${
              Math.random() * 99999999
            }`
          )
          .set(
            {
              clientTime: new Date(),
              serverTime: firebase.firestore.FieldValue.serverTimestamp(),
              action: `Connection detected, updating database...`,
            },
            { merge: true }
          );

        // Clear the old one
        if (refreshIntervalId !== null) {
          clearInterval(refreshIntervalId);
        }
        // Periodically refresh online status
        refreshIntervalId = setInterval(() => {
          userPresenceDatabaseRef.set(isOnlineForDatabase);

          // 50 minutes
        }, 1000 * 60 * 50);

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

        // REALTIME DB: ONLINE
        userPresenceDatabaseRef.set(isOnlineForDatabase);
        // FIRESTORE: ONLINE
        userPresenceRef.set(isOnlineForFirestore);
      }
    }
  }

  // Add all the listeners
  function subscribe() {
    isSubscribed = true;

    document.addEventListener("blur", onWindowFocusChange);
    document.addEventListener("focus", onWindowFocusChange);

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
    document.removeEventListener("blur", onWindowFocusChange);
    document.removeEventListener("focus", onWindowFocusChange);

    if (refreshIntervalId !== null) {
      clearInterval(refreshIntervalId);
      refreshIntervalId = null;
    }
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

  return { uid, username, unsubscribe, disconnect, signalOnline };
}
