export function insertIntoInput(newText, el = document.activeElement) {
  if (el.setRangeText) {
    const [start, end] = [el.selectionStart, el.selectionEnd];
    el.setRangeText(newText, start, end, "end");
  } else {
    el.value += newText + " ";
  }
}
