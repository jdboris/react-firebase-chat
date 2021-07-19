const functions = require("firebase-functions");
const Filter = require("bad-words");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const fetch = require("node-fetch");

admin.initializeApp();

const db = admin.firestore();

const OEMBED_PROVIDER_WHITELIST = ["YouTube", "Twitter"];

exports.detectEvilUsers = functions.firestore
  .document("messages/{msgId}")
  .onCreate(async (doc, ctx) => {
    const filter = new Filter();
    const { text, uid } = doc.data();

    if (filter.isProfane(text)) {
      const cleaned = filter.clean(text);
      await doc.ref.update({
        text: `🤐 I got BANNED for life for saying... ${cleaned}`,
      });

      await db.collection("bannedUsers").doc(uid).set({});
    }

    // const userRef = db.collection("users").doc(uid);

    // const userData = (await userRef.get()).data() || { msgCount: 0 };

    // if (userData.msgCount >= 7) {
    //   await db.collection("bannedUsers").doc(uid).set({});
    // } else {
    //   await userRef.set({ msgCount: (userData.msgCount || 0) + 1 });
    // }
  });

async function grantModeratorRole(email) {
  const user = await admin.auth().getUserByEmail(email);
  if (user.customClaims && user.customClaims.moderator === true) {
    return;
  }
  return admin.auth().setCustomUserClaims(user.uid, {
    moderator: true,
  });
}

exports.addModerator = functions.https.onCall((data, context) => {
  if (context.auth.token.moderator !== true) {
    return {
      error:
        "Request not authorized. User must be a moderator to fulfill request.",
    };
  }
  const email = data.email;
  return grantModeratorRole(email).then(() => {
    return {
      result: `Request fulfilled! ${email} is now a moderator.`,
    };
  });
});

exports.signUp = functions.https.onCall((data, context) => {
  return admin
    .auth()
    .createUser({
      email: data.email,
      emailVerified: false,
      password: data.password,
      displayName: data.username,
      // photoURL: "http://www.example.com/12345678/photo.png",
      disabled: false,
    })
    .then(function (userRecord) {
      // See the UserRecord reference doc for the contents of userRecord.
      return { success: true };
    })
    .catch(function (error) {
      console.error("Error creating new user:", error);
      return { success: false };
    });

  // return admin
  //   .auth()
  //   .createUserWithEmailAndPassword(data.email, data.password)
  //   .then((userCredential) => {
  //     let user = userCredential.user;
  //     console.log(user);
  //   })
  //   .catch((error) => {
  //     let errorCode = error.code;
  //     let errorMessage = error.message;
  //     console.error(errorCode);
  //     console.error(errorMessage);
  //   });
});

exports.sendWelcomeEmail = functions.auth.user().onCreate((user) => {
  // NOTE: Must create the document now to allow calling .update() later
  db.doc(`userPreferences/${user.uid}`).set({});

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
