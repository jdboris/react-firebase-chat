import React from "react";
import styles from "../css/chat-room.module.css";
import { useDebounce } from "../utils/utils";

export function SliderInput(props) {
  const setDebounce = useDebounce();

  return (
    <input
      type="range"
      min={props.min}
      max={props.max}
      defaultValue={props.defaultValue}
      className={styles["slider"]}
      // NOTE: Delay (debounce) calling the provided onChange listener, because sliding the range slider
      //       around will trigger the onChange event very rapidly, which could perform poorly.
      onChange={(e) => {
        setDebounce(() => props.onChange(e), 500);
      }}
      disabled={props.disabled}
    />
  );
}
