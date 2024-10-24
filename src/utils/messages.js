// import { firestore as db } from "..components";
import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDoc,
  getFirestore,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { v4 as uuid } from "uuid";
import { firestore } from "../components/chat-room-app";
import { CustomError } from "./errors";
import { isGiftedPremium } from "./utils";
import { getAuth, getIdTokenResult } from "firebase/auth";

export async function sendMessage(user, data, messages) {
  const db = getFirestore();

  if (!user || !user.auth) {
    throw new CustomError("Must be logged in.");
  }

  if (data.text.length > 2000) {
    throw new CustomError("Message too long (2000 character limit).");
  }

  if (data.conversationId !== "messages" && !user.auth.emailVerified) {
    throw new CustomError("Verify your email to do that.");
  }

  if (user.isBanned) {
    throw new CustomError("Your account or IP is banned.");
  }

  data.text = await filterWords(data.text);

  // NOTE: Escape the > character when not followed by whitespace, so it won't be rendered as a blockquote
  data.text = data.text.replace(/>(?!\s)/g, "\\$&");

  const idTokenResult = await getIdTokenResult(getAuth().currentUser);

  // const timestamp = new Date();
  const timestamp = serverTimestamp();

  const {
    font,
    fontColor,
    fontSize,
    msgBgImg,
    msgBgColor,
    msgBgTransparency,
    nameColor,
    msgBgRepeat,
    msgBgPosition,
    msgBgImgTransparency,
  } = user;

  const contents = {
    ...data,

    font,
    fontSize,
    fontColor,
    backgroundImage: msgBgImg,
    bgColor: msgBgColor,
    nameColor,
    bgTransparency: msgBgTransparency,
    msgBgRepeat,
    msgBgPosition,
    msgBgImgTransparency,

    uid: user.uid,
    username: user.username,
    lowercaseUsername: user.username.toLowerCase(),
    photoUrl: user.auth.photoURL || "",
    createdAt: timestamp,
    premium:
      idTokenResult.claims.stripeRole === "premium" || isGiftedPremium(user),
    isModMessage: user.isModerator,
  };

  if (data.conversationId != "messages") {
    await addDoc(
      collection(db, `conversations/${data.conversationId}/messages`),
      contents
    );

    await setDoc(
      doc(db, `conversations/${data.conversationId}`),
      {
        lastMessageSentAt: timestamp,
        users: {
          [user.uid]: {
            lastReadAt: timestamp,
          },
        },
      },
      { merge: true }
    );
  } else {
    const id = uuid();
    const BUFFER = 10;

    // setDoc(
    //   doc(db, `aggregateMessages/last25`),
    //   {
    //     // CREATE
    //     [`list.${id}`]: { ...contents, id },
    //     lastCreated: { ...contents, id },
    //     // DELETE
    //     ...(messages.length > 25 + BUFFER && {
    //       ...messages
    //         // Get the messages beyond the 25-message limit...
    //         .slice(-(messages.length - (25 + BUFFER)))
    //         // ...change them to "delete" sentinels.
    //         .reduce(
    //           (list, message) => ({
    //             ...list,
    //             [`list.${message.id}`]: deleteField(),
    //           }),
    //           {}
    //         ),
    //       lastDeleted: Object.fromEntries(
    //         messages
    //           .slice(-(messages.length - (25 + BUFFER)))
    //           .map((message) => [message.id, message])
    //       ),
    //     }),
    //   },
    //   { merge: true, mergeFields: ["list"] }
    // );

    const docData = {
      list: {
        [id]: { ...contents, id },

        ...messages.slice(25 + BUFFER).reduce(
          (list, message) => ({
            ...list,
            [message.id]: deleteField(),
          }),
          {}
        ),
      },

      lastCreated: { ...contents, id },

      ...(messages.length > 25 + BUFFER && {
        lastDeleted: messages.slice(25 + BUFFER).map((message) => message.id),
      }),
    };

    await setDoc(doc(db, `aggregateMessages/last25`), docData, {
      merge: true,
      mergeFields: ["list", "lastDeleted"],
    });

    await setDoc(doc(db, `messages/${id}`), contents);
  }

  if (user.email) {
    await updateDoc(doc(firestore, `users/${user.uid}`), {
      messageCount: increment(1),
    });
  }

  // NOTE: Don't bother awaiting
  httpsCallable(getFunctions(), "validateUser")();

  // TODO: Check if adding message document failed, call a cloud function to check why, then report why to the user.

  return true;
}

async function filterWords(text) {
  const db = getFirestore();
  const filteredWords = (
    await getDoc(doc(db, "settings/filteredWords"))
  ).data();

  return filteredWords
    ? text.replace(new RegExp(filteredWords.regex, "gi"), "[redacted]")
    : text;
}

export async function deleteMessage(message) {
  updateDoc(doc(getFirestore(), "aggregateMessages/last25"), {
    [`list.${message.id}`]: deleteField(),
    lastDeleted: [message.id],
  });

  updateDoc(doc(getFirestore(), `messages/${message.id}`), {
    isDeleted: true,
  });
}
