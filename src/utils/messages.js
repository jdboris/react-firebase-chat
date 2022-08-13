// import { firestore as db } from "..components";
import {
  getFirestore,
  doc,
  collection,
  getDoc,
  setDoc,
  addDoc,
  serverTimestamp,
  updateDoc,
  increment,
  deleteField,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { firestore } from "../components/chat-room-app";
import { CustomError } from "./errors";
import { isGiftedPremium } from "./utils";
import { v4 as uuid } from "uuid";

export async function sendMessage(user, data) {
  const db = getFirestore();

  if (!user.auth || !user) {
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

  // NOTE: Escape the > character because remark-gfm sanitizes it
  data.text = data.text.replace(/[>]/g, "\\$&");

  const idTokenResult = await user.auth.getIdTokenResult();

  // const timestamp = new Date();
  const timestamp = serverTimestamp();

  const contents = {
    ...data,
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
    setDoc(
      doc(db, `aggregateMessages/last25`),
      { list: { [id]: contents } },
      { merge: true }
    );

    setDoc(doc(db, `messages/${id}`), contents);
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
  setDoc(
    doc(getFirestore(), "aggregateMessages/last25"),
    {
      list: { [message.id]: deleteField() },
    },
    {
      merge: true,
    }
  );

  updateDoc(doc(getFirestore(), `messages/${message.id}`), {
    isDeleted: true,
  });
}
