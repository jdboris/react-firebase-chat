const functions = require("firebase-functions");
const admin = require("firebase-admin");
// const { Logging } = require("@google-cloud/logging");
// const logging = new Logging({
//   projectId: process.env.GCLOUD_PROJECT,
// });

// Errors: https://firebase.google.com/docs/reference/functions/providers_https_.html#functionserrorcode

admin.initializeApp();

const db = admin.firestore();
const OEMBED_PROVIDER_WHITELIST = ["YouTube", "Twitter"];
const HttpsError = functions.https.HttpsError;

async function getUser(uid) {
  const snapshot = await db.collection("users").doc(uid).get();
  return snapshot.data();
}

async function getUsersByIp(ip) {
  if (!ip) return [];
  const snapshot = await db
    .collection("users")
    .where("ipAddresses", "array-contains", ip)
    .get();
  return snapshot.docs;
}

async function markUserBanned(username) {
  const snapshot = await db
    .collection("users")
    .where("lowercaseUsername", "==", username.toLowerCase())
    .get();

  if (!snapshot.docs.length) {
    throw new HttpsError("not-found", "User not found.");
  }

  const user = await getUser(snapshot.docs[0].id);

  // If the user is banned already
  if (user.isBanned) {
    throw new HttpsError("already-exists", "User is already banned.");
  }

  if (user.isModerator) {
    throw new HttpsError("permission-denied", "Cannot ban a moderator.");
  }

  await db
    .collection("users")
    .doc(snapshot.docs[0].id)
    .update({ isBanned: true });
}

exports.banUser = functions.https.onCall(async (username, context) => {
  if (!context.auth.uid) {
    throw new HttpsError("unauthenticated", "Must be logged in.");
  }

  const user = await getUser(context.auth.uid);

  if (!user.isModerator) {
    throw new HttpsError(
      "permission-denied",
      "You must be a moderator to do that."
    );
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
    message: `${username} is now banned.`,
  };
});

async function markUserUnbanned(username) {
  const snapshot = await db
    .collection("users")
    .where("lowercaseUsername", "==", username.toLowerCase())
    .get();

  if (!snapshot.docs.length) {
    throw new HttpsError("not-found", "User not found.");
  }

  const user = await getUser(snapshot.docs[0].id);

  // If the user is not banned already
  if (!user.isBanned) {
    throw new HttpsError("already-exists", "User is not banned.");
  }

  await db
    .collection("users")
    .doc(snapshot.docs[0].id)
    .update({ isBanned: false });
}

exports.unbanUser = functions.https.onCall(async (username, context) => {
  if (!context.auth.uid) {
    throw new HttpsError("unauthenticated", "Must be logged in.");
  }

  const user = await getUser(context.auth.uid);

  if (!user.isModerator) {
    throw new HttpsError(
      "permission-denied",
      "You must be a moderator to do that."
    );
  }

  if (user.isBanned) {
    throw new HttpsError("permission-denied", "You are banned.");
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
    message: `${username} is no longer banned.`,
  };
});

async function grantModeratorRole(username) {
  const snapshot = await db
    .collection("users")
    .where("lowercaseUsername", "==", username.toLowerCase())
    .get();

  if (!snapshot.docs.length) {
    throw new HttpsError("not-found", "User not found.");
  }

  const user = await getUser(snapshot.docs[0].id);

  // If the user is a mod already
  if (user.isModerator) {
    throw new HttpsError("already-exists", "User is already a mod.");
  }

  if (user.isBanned) {
    throw new HttpsError("permission-denied", "Cannot mod a banned user.");
  }

  await db
    .collection("users")
    .doc(snapshot.docs[0].id)
    .update({ isModerator: true });
}

exports.addModerator = functions.https.onCall(async (username, context) => {
  if (!context.auth.uid) {
    throw new HttpsError("unauthenticated", "Must be logged in.");
  }

  const user = await getUser(context.auth.uid);

  if (!user.isAdmin) {
    throw new HttpsError(
      "permission-denied",
      "You must be an admin to do that."
    );
  }

  if (user.isBanned) {
    throw new HttpsError("permission-denied", "You are banned.");
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
    message: `${username} is now a moderator.`,
  };
});

async function revokeModeratorRole(username) {
  const snapshot = await db
    .collection("users")
    .where("lowercaseUsername", "==", username.toLowerCase())
    .get();

  if (!snapshot.docs.length) {
    throw new HttpsError("not-found", "User not found.");
  }

  const user = await getUser(snapshot.docs[0].id);

  // If the user is not a mod already
  if (!user.isModerator) {
    throw new HttpsError("already-exists", "User is not a moderator.");
  }

  await db
    .collection("users")
    .doc(snapshot.docs[0].id)
    .update({ isModerator: false });
}

exports.removeModerator = functions.https.onCall(async (username, context) => {
  if (!context.auth.uid) {
    throw new HttpsError("unauthenticated", "Must be logged in.");
  }

  const user = await getUser(context.auth.uid);

  if (!user.isModerator) {
    throw new HttpsError(
      "permission-denied",
      "You must be a moderator to do that."
    );
  }

  if (user.isBanned) {
    throw new HttpsError("permission-denied", "You are banned.");
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
    message: `${username} is no longer a moderator.`,
  };
});

async function filterWords(text) {
  const filteredWords = await db
    .collection("settings")
    .doc("filteredWords")
    .get();

  const data = filteredWords.data();

  return data
    ? text.replace(new RegExp(filteredWords.data().regex, "gi"), "[redacted]")
    : text;
}

exports.sendMessage = functions.https.onCall(async (data, context) => {
  if (!context.auth.uid) {
    throw new HttpsError("unauthenticated", "Must be logged in.");
  }

  if (context.rawRequest.ip) {
    db.doc(`users/${context.auth.uid}`).update({
      ipAddresses: admin.firestore.FieldValue.arrayUnion(context.rawRequest.ip),
    });
  }

  if (data.text.length > 2000) {
    throw new HttpsError(
      "invalid-argument",
      "Message too long (2000 character limit)."
    );
  }

  if (
    data.conversationId !== "messages" &&
    !context.auth.token.email_verified
  ) {
    throw new HttpsError("permission-denied", "Verify your email to do that.");
  }

  const userDoc = await db.collection("users").doc(context.auth.uid).get();
  const user = userDoc.data();

  const usersDocs = await getUsersByIp(context.rawRequest.ip);
  usersDocs.push(userDoc);

  // If one is banned, ban them all
  if (usersDocs.find((doc) => doc.data().isBanned)) {
    user.isBanned = true;
    const batch = db.batch();
    usersDocs.forEach((doc) => {
      if (!doc.data().isBanned) {
        batch.set(doc.ref, { isBanned: true }, { merge: true });
      }
    });
    await batch.commit();
  }

  if (user.isBanned) {
    throw new HttpsError("permission-denied", "You are banned.");
  }

  const authUser = await admin.auth().getUser(context.auth.uid);

  data.text = await filterWords(data.text);

  const timestamp = admin.firestore.FieldValue.serverTimestamp();

  const contents = {
    ...data,
    uid: context.auth.uid,
    username: user.username,
    lowercaseUsername: user.username.toLowerCase(),
    photoUrl: authUser.photoURL || "",
    createdAt: timestamp,
    premium: context.auth.token.stripeRole === "premium",
  };

  if (data.conversationId != "messages") {
    await db
      .collection("conversations")
      .doc(data.conversationId)
      .set(
        {
          lastMessageSentAt: timestamp,
          users: {
            [context.auth.uid]: {
              lastReadAt: timestamp,
            },
          },
        },
        { merge: true }
      );

    await db
      .collection("conversations")
      .doc(data.conversationId)
      .collection("messages")
      .add(contents);
  } else {
    await db.collection("messages").add(contents);
  }

  return {};
});

exports.signUp = functions.https.onCall(async (data, context) => {
  try {
    let anonSuffix;

    if (!data.anonymous) {
      if (data.username.match(/^anon\d+$/g)) {
        throw new HttpsError(
          "invalid-argument",
          "Invalid username (anonXXXX)."
        );
      }

      if (data.username.length < 4) {
        throw new HttpsError(
          "invalid-argument",
          "Username must be 4+ characters."
        );
      }

      if (!data.username.match(/^[a-z0-9]+$/i)) {
        throw new HttpsError(
          "invalid-argument",
          "Username may only contain letters and numbers."
        );
      }

      if (data.password.length < 8) {
        throw new HttpsError(
          "invalid-argument",
          "Password must be 8+ characters."
        );
      }

      // Require username to be unique
      const query = db
        .collection("users")
        .where("lowercaseUsername", "==", data.username.toLowerCase());
      const snapshot = await query.get();
      const docs = await snapshot.docs;
      if (docs.length > 0) {
        throw new HttpsError("invalid-argument", "Username taken.");
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
      data.username = "anon" + anonSuffix;
    }

    const authUser = await admin.auth().createUser(
      data.anonymous
        ? { displayName: data.username }
        : {
            email: data.email,
            emailVerified: false,
            password: data.password,
            displayName: data.username,
            // photoURL: "http://www.example.com/12345678/photo.png",
            disabled: false,
          }
    );

    if (!data.anonymous) {
      // const link = await admin
      //   .auth()
      //   .generateEmailVerificationLink(authUser.email);

      // const returnUrl = new URL(data.returnUrl);
      // returnUrl.searchParams.set(
      //   "chat-email-verification",
      //   encodeURIComponent(link)
      // );

      // // Construct email verification template, embed the link and send
      // // using custom SMTP server.
      // sendVerificationEmail(authUser.email, returnUrl.href);

      const returnUrl = new URL(data.returnUrl);
      returnUrl.searchParams.set("chat-email-verified", 1);
      returnUrl.searchParams.set("chat-logout", 1);

      const link = await admin
        .auth()
        .generateEmailVerificationLink(authUser.email, { url: returnUrl.href });

      // Construct email verification template, embed the link and send
      // using custom SMTP server.
      sendVerificationEmail(authUser.email, link);
    }

    // NOTE: Must create the document now to allow calling .update() later
    await db.doc(`users/${authUser.uid}`).set({
      username: data.username,
      lowercaseUsername: data.username.toLowerCase(),
      isBanned: false,
      isModerator: false,
      isAdmin: false,
      ...(data.anonymous ? { anonSuffix: anonSuffix } : {}),
    });

    const token = await admin.auth().createCustomToken(authUser.uid);

    // See the UserRecord reference doc for the contents of userRecord.
    return {
      ...(data.anonymous ? { token } : {}),
    };
  } catch (error) {
    if (error.errorInfo) {
      throw new HttpsError("unknown", error.errorInfo.message);
    } else {
      throw error;
    }
  }
});

exports.authenticate = functions.https.onCall(async (data, context) => {
  let user = null;

  try {
    const decodedToken = await admin.auth().verifyIdToken(data.idToken, true);

    user = {
      ...(await getUser(decodedToken.uid)),
      uid: decodedToken.uid,
      email: decodedToken.email,
      // NOTE: Must convert to boolean because Firebase sometimes sets it to null
      emailVerified: Boolean(decodedToken.email_verified),
    };
  } catch (error) {
    // TODO: CHECK THIS ERROR AFTER A LOGIN ATTEMPT WITH AN EXPIRED TOKEN.
    //       COMMUNICATE THE FACT THAT IT HAS EXPIRED IN THE RESPONSE
    // console.log(error);
    if (error.errorInfo) {
      throw new HttpsError("invalid-argument", error.errorInfo.message);
    } else {
      throw error;
    }
  }

  return user;
});

exports.resendVerificationEmail = functions.https.onCall(
  async (data, context) => {
    if (!context.auth.uid) {
      throw new HttpsError("unauthenticated", "Must be logged in.");
    }

    if (!context.auth.token.email) {
      throw new HttpsError(
        "permission-denied",
        "Create an account to do that."
      );
    }

    if (context.auth.token.email_verified) {
      throw new HttpsError("already-exists", "Your email is already verified.");
    }

    // const link = await admin
    //   .auth()
    //   .generateEmailVerificationLink(context.auth.token.email);

    // const returnUrl = new URL(data.returnUrl);
    // returnUrl.searchParams.set(
    //   "chat-email-verification",
    //   encodeURIComponent(link)
    // );
    // await sendVerificationEmail(context.auth.token.email, returnUrl.href);

    const returnUrl = new URL(data.returnUrl);
    returnUrl.searchParams.set("chat-email-verified", 1);
    returnUrl.searchParams.set("chat-logout", 1);

    const link = await admin
      .auth()
      .generateEmailVerificationLink(context.auth.token.email, {
        url: returnUrl.href,
      });

    await sendVerificationEmail(context.auth.token.email, link);

    return {
      message: "Verification email sent. Check your inbox to continue.",
    };
  }
);

async function sendVerificationEmail(email, link) {
  const nodemailer = require("nodemailer");
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

    // NOTE: Use https://htmlemail.io/inline/
    const mailOptions = {
      from: functions.config().accounts.support.username,
      to: email,
      subject: "Welcome to Chatpad!",
      text: `
        Welcome to Chatpad! Please visit ${link} to verify your email address.
      `,
      html: `
      <html>
        <body>
          <div class="header" style="display: block; max-width: 600px; margin: auto; text-align: center; background: #85a7cb; color: #fdfdfd; font-size: 30px; font-weight: bold; padding: 8px;">Chatpad</div>
          <div class="main" style="display: block; max-width: 600px; margin: auto; text-align: center; padding: 5px;">
            <p style="color: black;">Welcome to Chatpad! Please verify your email address.</p>
            <a class="button-link" href="${link}" style="box-sizing: border-box; border-radius: 4px; background: #ff985c; color: #fdfdfd; padding: 5px; text-decoration: none; font-size: 1.5em; font-weight: bold; display: block; max-width: 200px; margin: auto;">Verify Email</a>
          </div>
          <div class="footer" style="display: block; max-width: 600px; margin: auto; background: #f1f1f1; font-size: 10px; padding: 8px; color: #1d1d1d; text-align: center;">
            <a href="http://www.chatpad.app">chatpad.app</a>
          </div>
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

exports.sendPasswordResetEmail = functions.https.onCall(
  async (data, context) => {
    try {
      const link = await admin.auth().generatePasswordResetLink(data.email);
      if (!link) {
        throw new HttpsError(
          "internal",
          "Something went wrong. Please try again."
        );
      }

      const returnUrl = new URL(data.returnUrl);
      returnUrl.searchParams.set(
        "chat-reset-password",
        encodeURIComponent(link)
      );

      const nodemailer = require("nodemailer");
      const transporter = nodemailer.createTransport({
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

      // NOTE: Use https://htmlemail.io/inline/
      const mailOptions = {
        from: functions.config().accounts.support.username,
        to: data.email,
        subject: "Chatpad password reset",
        text: `
          Chatpad has received a request to reset your password. Please visit ${returnUrl} to complete the reset. If you did not initiate this reset, you may ignore this message.
        `,
        html: `
          <html>
            <body>
              <div class="header" style="display: block; max-width: 600px; margin: auto; text-align: center; background: #85a7cb; color: #fdfdfd; font-size: 30px; font-weight: bold; padding: 8px;">Chatpad</div>
              <div class="main" style="display: block; max-width: 600px; margin: auto; text-align: center; padding: 5px;">
                <p style="color: black;">Chatpad has received a request to reset your password. If you did not initiate this reset, you may ignore this message.</p>
                <a class="button-link" href="${returnUrl}" style="box-sizing: border-box; border-radius: 4px; background: #ff985c; color: #fdfdfd; padding: 5px; text-decoration: none; font-size: 1.5em; font-weight: bold; display: block; max-width: 200px; margin: auto;">Reset Password</a>
              </div>
              <div class="footer" style="display: block; max-width: 600px; margin: auto; background: #f1f1f1; font-size: 10px; padding: 8px; color: #1d1d1d; text-align: center;">
                <a href="http://www.chatpad.app">chatpad.app</a>
              </div>
            </body>
          </html>
        `,
      };

      await new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            reject(error);
          } else {
            resolve(info.response);
          }
        });
      });

      return {
        message:
          "Password reset request received. Check your email to continue.",
      };
    } catch (error) {
      throw new HttpsError(
        "internal",
        "Something went wrong. Please try again."
      );
    }
  }
);

// Create a new function which is triggered on changes to /userPresences/{uid}
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
  const fetch = require("node-fetch");
  return fetch("https://oembed.com/providers.json")
    .then((response) => {
      if (!response.ok) {
        throw new HttpsError("unavailable", "Could not fetch oembed proviers.");
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
  const fetch = require("node-fetch");
  if (!context.auth || !context.auth.uid) {
    throw new HttpsError("unauthenticated", "Must be logged in.");
  }

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
  const user = await getUser(context.auth.uid);

  if (context.auth.token.email == null) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Create an account to do that."
    );
  }

  if (user.isBanned) {
    throw new HttpsError("permission-denied", "You are banned.");
  }

  if (!context.auth.uid) {
    throw new HttpsError("unauthenticated", "Must be logged in.");
  }

  const { fromBuffer: fileTypeFromBuffer } = require("file-type");
  const crypto = require("crypto");
  const premium = context.auth.token.stripeRole === "premium";

  const megabyteSize = 1024 * 1024;
  // 10 Megabytes
  const premiumSizeLimit = 10 * megabyteSize;
  // 4 Megabytes
  const sizeLimit = 4 * megabyteSize;
  const allowedTypes = ["image/jpeg", "image/jpeg", "image/png", "image/gif"];

  const { base64FileString, extension } = data;
  const bucket = admin.storage().bucket();
  // NOTE: Must cut off the metadata that browsers put at the beginning
  //       https://stackoverflow.com/questions/67671971/error-loading-preview-on-firebase-storage-with-images-uploaded-from-firebase-ad
  const imageBuffer = Buffer.from(
    base64FileString.split(";base64,")[1],
    "base64"
  );

  if (!premium && imageBuffer.byteLength > sizeLimit) {
    throw new HttpsError(
      "invalid-argument",
      `File too large (${
        sizeLimit / megabyteSize
      }MB limit). Upgrade to Premium for a higher limit.`
    );
  }

  if (imageBuffer.byteLength > premiumSizeLimit) {
    throw new HttpsError(
      "invalid-argument",
      `File too large (${premiumSizeLimit / megabyteSize}MB limit).`
    );
  }

  const type = await fileTypeFromBuffer(imageBuffer);
  if (!type || !allowedTypes.includes(type.mime)) {
    throw new HttpsError("invalid-argument", "Filetype not supported.");
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
