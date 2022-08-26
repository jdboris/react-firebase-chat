import React from "react";
import { useDebounce } from "../utils/utils";

export function ColorInput(props) {
  const setDebounce = useDebounce();

  return (
    <input
      type="color"
      // NOTE: Delay (debounce) calling the provided onChange listener, because sliding the color input
      //       around will trigger the onChange event very rapidly, which could perform poorly.
      onChange={(e) => {
        setDebounce(() => props.onChange(e), 500);
      }}
      onClick={props.onClick}
      onClickCapture={props.onClickCapture}
      defaultValue={props.defaultValue}
      disabled={props.disabled}
    />
  );
}
