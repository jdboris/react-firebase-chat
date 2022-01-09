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
  let url = new URL(urlString);
  return SUPPORTED_IMAGE_EXTENSIONS.includes(url.pathname.split(".").pop());
}
