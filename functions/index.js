const functions = require("firebase-functions");
const Filter = require("bad-words");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const fetch = require("node-fetch");
const crypto = require("crypto");
const { fromBuffer: fileTypeFromBuffer } = require("file-type");
const { user } = require("firebase-functions/lib/providers/auth");
const { CollectionsBookmarkOutlined } = require("@material-ui/icons");

admin.initializeApp();

const db = admin.firestore();
const OEMBED_PROVIDER_WHITELIST = ["YouTube", "Twitter"];

// async function logoutUser(user) {
//   return admin
//     .auth()
//     .revokeRefreshTokens(user.uid)
//     .then(() => {
//       return admin.auth().getUser(user.uid);
//     })
//     .then((userRecord) => {
//       return new Date(userRecord.tokensValidAfterTime).getTime() / 1000;
//     });
// }

async function getUser(uid) {
  const snapshot = await db.collection("users").doc(uid).get();
  return snapshot.data();
}

async function markUserBanned(username) {
  const snapshot = await db
    .collection("users")
    .where("username", "==", username)
    .get();

  if (!snapshot.docs.length) {
    return {
      error: "User not found.",
    };
  }

  const user = await getUser(snapshot.docs[0].id);

  // If the user is banned already
  if (user.isBanned === true) {
    return {
      error: "User is already banned.",
    };
  }

  if (user.isModerator === true) {
    return {
      error: "Cannot ban a moderator.",
    };
  }

  await db
    .collection("users")
    .doc(snapshot.docs[0].id)
    .update({ isBanned: true });
}

exports.banUser = functions.https.onCall(async (username, context) => {
  const user = await getUser(context.auth.uid);

  if (user.isModerator !== true) {
    return {
      error:
        "Request not authorized. User must be a moderator to fulfill request.",
    };
  }

  const result = await markUserBanned(username);
  if (result) {
    return result;
  }

  await db.collection("modActionLog").add({
    uid: context.auth.uid,
    action: user.username + " banned " + username,
    date: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    result: `Request fulfilled! ${username} is now banned.`,
  };
});

async function markUserUnbanned(username) {
  const snapshot = await db
    .collection("users")
    .where("username", "==", username)
    .get();

  if (!snapshot.docs.length) {
    return {
      error: "User not found.",
    };
  }

  const user = await getUser(snapshot.docs[0].id);

  // If the user is not banned already
  if (!user.isBanned) {
    return {
      error: "User is not banned.",
    };
  }

  await db
    .collection("users")
    .doc(snapshot.docs[0].id)
    .update({ isBanned: false });
}

exports.unbanUser = functions.https.onCall(async (username, context) => {
  const user = await getUser(context.auth.uid);

  if (user.isModerator !== true) {
    return {
      error:
        "Request not authorized. User must be a moderator to fulfill request.",
    };
  }

  const result = await markUserUnbanned(username);
  if (result) {
    return result;
  }

  await db.collection("modActionLog").add({
    uid: context.auth.uid,
    action: user.username + " unbanned " + username,
    date: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    result: `Request fulfilled! ${username} is no longer banned.`,
  };
});

async function grantModeratorRole(username) {
  const snapshot = await db
    .collection("users")
    .where("username", "==", username)
    .get();

  if (!snapshot.docs.length) {
    return {
      error: "User not found.",
    };
  }

  const user = await getUser(snapshot.docs[0].id);

  // If the user is a mod already
  if (user.isModerator === true) {
    return {
      error: "User is already a mod.",
    };
  }

  if (user.isBanned === true) {
    return {
      error: "Cannot mod a banned user.",
    };
  }

  await db
    .collection("users")
    .doc(snapshot.docs[0].id)
    .update({ isModerator: true });
}

exports.addModerator = functions.https.onCall(async (username, context) => {
  const user = await getUser(context.auth.uid);

  if (user.isModerator !== true) {
    return {
      error:
        "Request not authorized. User must be a moderator to fulfill request.",
    };
  }

  const result = await grantModeratorRole(username);
  if (result) {
    return result;
  }

  await db.collection("modActionLog").add({
    uid: context.auth.uid,
    action: user.username + " modded " + username,
    date: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    result: `Request fulfilled! ${username} is now a moderator.`,
  };
});

async function revokeModeratorRole(username) {
  const snapshot = await db
    .collection("users")
    .where("username", "==", username)
    .get();

  if (!snapshot.docs.length) {
    return {
      error: "User not found.",
    };
  }

  const user = await getUser(snapshot.docs[0].id);

  // If the user is not a mod already
  if (!user.isModerator) {
    return {
      error: "User is not a moderator.",
    };
  }

  await db
    .collection("users")
    .doc(snapshot.docs[0].id)
    .update({ isModerator: false });
}

exports.removeModerator = functions.https.onCall(async (username, context) => {
  const user = await getUser(context.auth.uid);

  if (user.isModerator !== true) {
    return {
      error:
        "Request not authorized. User must be a moderator to fulfill request.",
    };
  }

  const result = await revokeModeratorRole(username);
  if (result) {
    return result;
  }

  await db.collection("modActionLog").add({
    uid: context.auth.uid,
    action: user.username + " unmodded " + username,
    date: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    result: `Request fulfilled! ${username} is no longer a moderator.`,
  };
});

exports.signUp = functions.https.onCall(async (data, context) => {
  let anonSuffix;

  if (!data.anonymous) {
    if (data.username.match(/^anon\d+$/g)) {
      return { success: false, message: "Invalid username." };
    }

    // Require username to be unique
    const query = db.collection("users").where("username", "==", data.username);
    const snapshot = await query.get();
    const docs = await snapshot.docs;
    if (docs.length > 0) {
      return { success: false, message: "Username taken." };
    }
  } else {
    // Select users whose names start with "anon"
    const query = db
      .collection("users")
      .where("anonSuffix", ">=", 0)
      .orderBy("anonSuffix", "desc")
      .limit(1);

    const snapshot = await query.get();
    const docs = await snapshot.docs;
    anonSuffix = docs.length ? docs[0].data().anonSuffix + 1 : 0;
    user.username = "anon" + anonSuffix;
  }

  return admin
    .auth()
    .createUser(
      data.anonymous
        ? { displayName: user.username }
        : {
            email: data.email,
            emailVerified: false,
            password: data.password,
            displayName: data.username,
            // photoURL: "http://www.example.com/12345678/photo.png",
            disabled: false,
          }
    )
    .then(async (userRecord) => {
      // NOTE: Must create the document now to allow calling .update() later
      db.doc(`users/${userRecord.uid}`).set({
        username: userRecord.displayName,
        isBanned: false,
        isModerator: false,
        isAdmin: false,
        ...(data.anonymous ? { anonSuffix: anonSuffix } : {}),
      });

      const token = await admin.auth().createCustomToken(userRecord.uid);

      // See the UserRecord reference doc for the contents of userRecord.
      return {
        success: true,
        ...(data.anonymous ? { token } : {}),
      };
    })
    .catch(function (error) {
      console.error("Error creating new user:", error);
      return {
        success: false,
        message: "Something went wrong. Please try again.",
      };
    });
});

exports.sendWelcomeEmail = functions.auth.user().onCreate((user) => {
  if (user.email) {
    // Admin SDK API to generate the email verification link.
    return admin
      .auth()
      .generateEmailVerificationLink(user.email)
      .then((link) => {
        // Construct email verification template, embed the link and send
        // using custom SMTP server.
        return sendVerificationEmail(user.email, user.displayName, link);
      })
      .then((response) => {
        //console.log("Email sent: " + response);
      })
      .catch((error) => {
        console.error(error);
      });
  }
});

async function sendVerificationEmail(email, username, link) {
  return new Promise((resolve, reject) => {
    // https://support.google.com/a/answer/176600?hl=en
    const transporter = nodemailer.createTransport({
      // NOTE: The latest version of nodemailer has a bug preventing it from resolving the hostname.
      //       Must set host to IP and tos.servername to hostname as a workaround.
      // https://github.com/nodemailer/nodemailer/issues/1041#issuecomment-515045214
      //host: "smtp.gmail.com",
      host: "64.233.184.109",
      tls: {
        servername: "smtp.gmail.com",
      },
      port: 587,
      // NOTE: Must set this to false, but TLS will still be used.
      secure: false,
      auth: {
        user: functions.config().accounts.support.username,
        pass: functions.config().accounts.support.password,
      },
    });

    const mailOptions = {
      from: functions.config().accounts.support.username,
      to: email,
      subject: "Welcome to Chatpad!",
      text: `
          Welcome to Chatpad! Please visit ${link} to verify your email address.
      `,
      html: `
        <html>
            <head>
                <style>

                    header, footer, main {
                        max-width: 600px;
                        text-align: center;
                    }

                    header {
                        background: rgb(36, 36, 179);
                        font-size: 30px;
                        padding: 8px;
                        text-align: center;
                    }

                    footer {
                        background: gray;
                        font-size: 10px;
                        padding: 8px;
                        color: rgb(29, 29, 29);
                        text-align: center;
                    }

                    p {
                        text-align: initial;
                    }

                    .button-link {
                        border-radius: 5px;
                        background: rgb(36, 36, 179);
                        color: rgb(196, 196, 196);
                        padding: 10px;
                        text-decoration: none;
                        font-size: 1.5em;
                    }
                </style>
            </head>
            <body>
                <header>Chatpad</header>
                <main>
                  <p>
                    Welcome to Chatpad! Please verify your email address.
                  </p>
                  <a class="button-link" href="${link}">Verify</a>
                </main>
                <footer>
                    <a href="http://www.chatpad.app">chatpad.app</a>
                </footer>
            </body>
        </html>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        reject(error);
      } else {
        resolve(info.response);
      }
    });
  });
}

// Create a new function which is triggered on changes to /status/{uid}
// Note: This is a Realtime Database trigger, *not* Firestore.
exports.onUserStatusChanged = functions.database
  .ref("/userPresences/{uid}")
  .onUpdate(async (change, context) => {
    // Get the data written to Realtime Database
    const eventStatus = change.after.val();
    // Then use other event data to create a reference to the
    // corresponding Firestore document.
    const userStatusFirestoreRef = db.doc(
      `userPresences/${context.params.uid}`
    );

    // It is likely that the Realtime Database change that triggered
    // this event has already been overwritten by a fast change in
    // online / offline status, so we'll re-read the current data
    // and compare the timestamps.
    const statusSnapshot = await change.after.ref.once("value");
    const status = statusSnapshot.val();

    // functions.logger.log(status, eventStatus);
    // If the current timestamp for this data is newer than
    // the data that triggered this event, we exit this function.
    if (status.lastChanged > eventStatus.lastChanged) {
      return null;
    }

    // Otherwise, we convert the lastChanged field to a Date
    eventStatus.lastChanged = new Date(eventStatus.lastChanged);

    // ... and write it to Firestore.
    return userStatusFirestoreRef.set(eventStatus);
  });

// exports.getOembedProviders = functions.https.onCall((data, context) => {
async function getOembedProviders() {
  return fetch("https://oembed.com/providers.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Could not fetch oembed proviers.");
      }

      return response.json();
    })
    .then((data) => {
      // Only include the whitelist
      let result = {
        providers: data.reduce((accumulator, provider) => {
          if (OEMBED_PROVIDER_WHITELIST.includes(provider.provider_name)) {
            db.collection("oembedProviders")
              .doc(provider.provider_name)
              .set(provider);
            accumulator[provider.provider_name] = provider;
          }
          return accumulator;
        }, {}),
      };

      return result;
    })
    .catch((error) => {
      console.error(error);
    });
}

// NOTE: Escapes the string for RegEx EXCEPT FOR '*'
function escapeRegExExceptStar(string) {
  return string.replace(/[.+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

exports.getOembed = functions.https.onCall(async (data, context) => {
  const snapshot = await db.collection("settings").get("oembed");
  let settings = {};

  const weekInMilliseconds = 1000 * 60 * 60 * 24 * 7;

  if (
    !snapshot.docs.length ||
    ((settings = snapshot.docs[0].data()) &&
      (!settings.lastProviderUpdate ||
        Date.now() >
          settings.lastProviderUpdate.toMillis() + weekInMilliseconds))
  ) {
    const result = await getOembedProviders();
    if (result.providers) {
      await db
        .collection("settings")
        .doc("oembed")
        .set({
          ...settings,
          lastProviderUpdate: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
  }

  return db
    .collection("oembedProviders")
    .get()
    .then((snapshot) => {
      let providers = snapshot.docs.map((doc) => doc.data());

      if (providers && providers.length) {
        for (let provider of providers) {
          // For each possible scheme...
          for (let scheme of provider.endpoints[0].schemes) {
            let escaped = escapeRegExExceptStar(scheme);
            escaped = escaped.replace(/\*/g, "(.*)");
            let pattern = new RegExp("^" + escaped, "gi");

            // ...if the provided URL matches the scheme
            if (pattern.test(data.url)) {
              // Fetch and return the HTML for the embed
              let endpoint = `${
                provider.endpoints[0].url
              }?url=${encodeURIComponent(data.url)}`;

              return fetch(endpoint)
                .then((response) => {
                  return response.json();
                })
                .then((data) => {
                  return {
                    providerName: provider.provider_name,
                    html: data.html,
                  };
                });
            }
          }
        }

        return {
          providerName: null,
          html: null,
        };
      }
    });
});

exports.uploadFile = functions.https.onCall(async (data, context) => {
  if (!context.auth.uid) {
    return { error: "Must be logged in." };
  }

  // 10 Megabytes
  const sizeLimit = 10 * 1024 * 1024;
  const allowedTypes = ["image/jpeg", "image/jpeg", "image/png", "image/gif"];

  const { base64FileString, extension } = data;
  const bucket = admin.storage().bucket();
  // NOTE: Must cut off the metadata that browsers put at the beginning
  //       https://stackoverflow.com/questions/67671971/error-loading-preview-on-firebase-storage-with-images-uploaded-from-firebase-ad
  const imageBuffer = Buffer.from(
    base64FileString.split(";base64,")[1],
    "base64"
  );

  if (imageBuffer.byteLength > sizeLimit) {
    return { error: "File too large." };
  }

  const type = await fileTypeFromBuffer(imageBuffer);
  if (!type || !allowedTypes.includes(type.mime)) {
    return { error: "Filetype not supported." };
  }

  const imageByteArray = new Uint8Array(imageBuffer);
  const uuid = crypto.randomBytes(16).toString("hex");
  const file = bucket.file(`${context.auth.uid}/${uuid}.${extension}`);

  // const options = { resumable: false, metadata: { contentType: "image/jpg" } };
  const options = { resumable: false, public: true };
  //options may not be necessary

  await file.save(imageByteArray, options);
  return { url: await file.publicUrl() };
});
