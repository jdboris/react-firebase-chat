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
  let value = element.value;
  let start = element.selectionStart;
  let end = element.selectionEnd;
  if (start == end) {
    start = 0;
    end = value.length;
  }

  // Trim the whitespace
  for (let i = end - 1; i >= 0; i--) {
    if (/\s/.test(value[i])) end--;
    else break;
  }

  for (let i = start; i < value.length; i++) {
    if (/\s/.test(value[i])) start++;
    else break;
  }

  let frontMarkup = getMarkupAround(value, start);
  frontMarkup.value = toggleSymbolInMarkup(frontMarkup.value, symbol);

  let backMarkup = getMarkupAround(value, end);
  // Reverse+unreverse the markup so the new symbol will be added in the right spot
  backMarkup.value = reverse(
    toggleSymbolInMarkup(reverse(backMarkup.value), symbol)
  );

  let middleValue = value.substring(frontMarkup.end, backMarkup.start);
  if (!middleValue) return "";

  let firstHalf = value.substring(0, frontMarkup.start) + frontMarkup.value;

  let parts = [
    firstHalf,
    middleValue,
    backMarkup.value,
    value.substring(backMarkup.end),
  ];

  return {
    value: parts.join(""),
    start: firstHalf.length,
    end: firstHalf.length + middleValue.length,
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
