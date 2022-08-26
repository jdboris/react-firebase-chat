import { useEffect, useState } from "react";

const SUPPORTED_IMAGE_EXTENSIONS = [
  "apng",
  "avif",
  "gif",
  "jpg",
  "jpeg",
  "jfif",
  "pjpeg",
  "pjp",
  "png",
  "svg",
  "webp",
  "bmp",
  "ico",
  "cur",
];

export function insertIntoInput(newText, el = document.activeElement) {
  if (el.setRangeText) {
    const [start, end] = [el.selectionStart, el.selectionEnd];
    el.setRangeText(newText, start, end, "end");
  } else {
    el.value += newText + " ";
  }
}

//                      milliseconds
export function timeout(durationInMs, asyncFunction) {
  return Promise.race([
    asyncFunction(),
    new Promise(function (resolve, reject) {
      setTimeout(function () {
        // reject(`Promise timed out after ${durationInMs}ms.`);
        resolve(`Promise timed out after ${durationInMs}ms.`);
      }, durationInMs);
    }),
  ]);
}

export function setQueryParam(key, value) {
  const url = new URL(window.location);
  if (value === null) {
    url.searchParams.delete(key);
  } else {
    url.searchParams.set(key, value);
  }
  const queryString = url.searchParams.toString();
  const hash = window.location.hash;
  window.history.replaceState(
    {},
    "",
    `${window.location.pathname}${queryString ? "?" + queryString : ""}${hash}`
  );
}

export function isImageUrl(urlString) {
  const url = new URL(urlString);
  return SUPPORTED_IMAGE_EXTENSIONS.includes(
    url.pathname.split(".").pop().toLocaleLowerCase()
  );
}

export async function getImageSize(url) {
  const response = await fetch(url, { method: "HEAD" });
  return response.headers.get("content-length");
}

export function stripHtml(string) {
  let doc = new DOMParser().parseFromString(string, "text/html");
  return doc.body.textContent || "";
}

let isFlashingInTitle = false;
let flashingTitleIntervalId = null;

export function flashInTitle(text, interval = 1000) {
  const originalTitle = top.document.title;
  if (!isFlashingInTitle && !document.hasFocus()) {
    isFlashingInTitle = true;
    let on = true;
    // Limit to 50 characters
    text = text.substring(0, 50);
    top.document.title = text;

    flashingTitleIntervalId = setInterval(() => {
      if (on) {
        top.document.title = originalTitle;
      } else {
        top.document.title = text;
      }
      on = !on;
    }, interval);

    window.addEventListener("focus", () => {
      clearInterval(flashingTitleIntervalId);
      flashingTitleIntervalId = null;
      top.document.title = originalTitle;
      isFlashingInTitle = false;
    });
  }
}

export function isGiftedPremium(user) {
  return Boolean(
    user.giftedPremiumStart &&
      user.giftedPremiumEnd &&
      new Date() >= user.giftedPremiumStart.toDate() &&
      new Date() <= user.giftedPremiumEnd.toDate()
  );
}

export function useDebounce(value = null) {
  const [debounce, setDebounce] = useState(value);

  useEffect(() => {
    if (debounce) {
      const timeout = setTimeout(debounce[0], debounce[1]);
      return () => clearTimeout(timeout);
    }
  }, [debounce]);

  return (callback, delay) => setDebounce([callback, delay]);
}
