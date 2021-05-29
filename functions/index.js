const functions = require("firebase-functions");
const Filter = require("bad-words");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const credentials = require("./credentials");

admin.initializeApp();

const db = admin.firestore();

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

      await db.collection("banned").doc(uid).set({});
    }

    // const userRef = db.collection("users").doc(uid);

    // const userData = (await userRef.get()).data() || { msgCount: 0 };

    // if (userData.msgCount >= 7) {
    //   await db.collection("banned").doc(uid).set({});
    // } else {
    //   await userRef.set({ msgCount: (userData.msgCount || 0) + 1 });
    // }
  });

exports.sendWelcomeEmail = functions.auth.user().onCreate((user) => {
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
      console.log("Email sent: " + response);
    })
    .catch((error) => {
      console.log(error);
    });
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
        user: credentials.supportEmail.username,
        pass: credentials.supportEmail.password,
      },
    });

    const mailOptions = {
      from: credentials.supportEmail.username,
      to: email,
      subject: "Welcome to Chat App!",
      text: `
        Welcome to Chat App! Please visit ${link} to verify your email address.
    `,
      // html: `
      //   <html>
      //       <head>
      //           <style>
      //               header {
      //                   background: rgb(36, 36, 179);
      //                   font-size: 30px;
      //                   padding: 8px;
      //                   text-align: center;
      //               }

      //               footer {
      //                   background: gray;
      //                   font-size: 10px;
      //                   padding: 8px;
      //                   color: rgb(29, 29, 29);
      //                   text-align: center;
      //               }

      //               .button-link {
      //                   border-radius: 5px;
      //                   background: rgb(36, 36, 179);
      //                   color: rgb(196, 196, 196);
      //                   padding: 8px;
      //                   text-decoration: none;
      //               }
      //           </style>
      //       </head>
      //       <body>
      //           <header>Chat App</header>
      //           <main>
      //             Welcome to Chat App! Please verify your email address.
      //             <a class="button-link" href="${link}">Verify</a>
      //           </main>
      //           <footer>
      //               <a href="http://www.chatapp.com">chatapp.com</a>
      //           </footer>
      //       </body>
      //   </html>
      // `,
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
