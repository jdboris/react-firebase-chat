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
