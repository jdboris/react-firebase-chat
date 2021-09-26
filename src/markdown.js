// NOTE: These symbols must be listed here in order of of length (descending)
export const MARKUP_SYMBOLS = {
  BOLD: "**",
  ITALICS: "*",
  UNDERLINE: "_",
};

const MARKUP_CHARACTERS = new Set(
  Object.values(MARKUP_SYMBOLS).reduce((a, b) => a + b)
);

// Returns the selected text in the given input element, surrounded by the given symbol
export function toggleSelectionMarkup(element, symbol) {
  const value = element.value;
  const start = element.selectionStart;
  const end = element.selectionEnd;

  const frontMarkup =
    start == end
      ? getMarkupBefore(value, start)
      : getMarkupAround(value, start);
  const backMarkup =
    start == end ? getMarkupAfter(value, end) : getMarkupAround(value, end);

  const beforeMarkup = value.substring(0, frontMarkup.start);
  const middleValue = value.substring(frontMarkup.end, backMarkup.start);
  const afterMarkup = value.substring(backMarkup.end);

  frontMarkup.value = toggleSymbolInMarkup(frontMarkup.value, symbol);
  // Reverse+unreverse the markup so the new symbol will be added in the right spot
  backMarkup.value = reverse(
    toggleSymbolInMarkup(reverse(backMarkup.value), symbol)
  );

  let parts = [
    beforeMarkup,
    frontMarkup.value,
    middleValue,
    backMarkup.value,
    afterMarkup,
  ];

  return {
    value: parts.join(""),
    start: beforeMarkup.length + frontMarkup.value.length,
    end: beforeMarkup.length + frontMarkup.value.length + middleValue.length,
  };
}

function reverse(s) {
  return [...s].reverse().join("");
}

function toggleSymbolInMarkup(markup, symbol) {
  let newMarkup = markup;
  let leftovers = "";
  // Loop through the markup symbols and remove each one until reaching
  // the given one. As long as MARKUP_SYMBOLS are in the appropriate
  // order, and there are no duplicate symbols in the markup, then this
  // will prevent mixing up two symbols that share characters (i.e. "**" and "*")
  for (let key in MARKUP_SYMBOLS) {
    if (MARKUP_SYMBOLS[key] == symbol) {
      break;
    }

    if (newMarkup.includes(MARKUP_SYMBOLS[key])) {
      leftovers += MARKUP_SYMBOLS[key];
      newMarkup = newMarkup.replace(MARKUP_SYMBOLS[key], "");
    }
  }

  if (newMarkup.includes(symbol)) {
    // Remove the symbol
    newMarkup = newMarkup.replace(symbol, "");
    return leftovers + newMarkup;
  } else {
    // Insert the symbol
    return leftovers + symbol + newMarkup;
  }
}

function getMarkupBefore(string, index) {
  let firstHalf = string.substring(0, index);
  const markup = getMarkupAround(firstHalf, Math.max(firstHalf.length - 1, 0));
  markup.end = index;
  markup.start = markup.end - markup.value.length;

  return markup;
}

function getMarkupAfter(string, index) {
  let secondHalf = string.substring(index);
  const markup = getMarkupAround(secondHalf, 0);
  markup.start = index;
  markup.end = markup.start + markup.value.length;

  return markup;
}

function getMarkupAround(string, index) {
  let markup = { start: index, end: index, value: "" };

  for (let i = index - 1; i >= 0; i--) {
    if (!MARKUP_CHARACTERS.has(string[i])) {
      break;
    }

    markup.start -= 1;
    markup.value = string[i] + markup.value;
  }

  for (let i = index; i < string.length; i++) {
    if (!MARKUP_CHARACTERS.has(string[i])) {
      break;
    }

    markup.end += 1;
    markup.value += string[i];
  }

  return markup;
}

// let frontMarkup = getMarkupBefore(value, start);
// frontMarkup = toggleSymbolInMarkup(frontMarkup.value, symbol);

// console.log(frontMarkup);

// let backMarkup = getMarkupAfter(value, end);
// // Reverse+unreverse the markup so the new symbol will be added in the right spot
// backMarkup.value = reverse(backMarkup.value);
// backMarkup = toggleSymbolInMarkup(backMarkup, symbol);
// backMarkup.value = reverse(backMarkup.value);

// console.log(backMarkup);
