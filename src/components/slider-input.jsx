import React, { useState } from "react";
import styles from "../css/chat-room.module.css";

export function SliderInput(props) {
  const [completeTimeout, setCompleteTimeout] = useState(null);
  const [delayTimeout, setDelayTimeout] = useState(null);

  return (
    <input
      type="range"
      min={props.min}
      max={props.max}
      defaultValue={props.defaultValue}
      className={styles["slider"]}
      // NOTE: Delay calling the provided onChange listener, because sliding the range slider
      //       around will trigger the onChange event very rapidly, which could perform poorly.
      onChange={(e) => {
        if (delayTimeout === null) {
          setDelayTimeout(
            setTimeout(() => {
              clearTimeout(completeTimeout);
              setCompleteTimeout(
                setTimeout(() => {
                  props.onChangeComplete(e);
                }, 500)
              );

              props.onChange(e);
              setDelayTimeout(null);
            }, 200)
          );
        }
      }}
    />
  );
}
