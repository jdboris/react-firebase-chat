import React, { useState } from "react";

export function ColorInput(props) {
  const [completeTimeout, setCompleteTimeout] = useState(null);
  const [delayTimeout, setDelayTimeout] = useState(null);

  return (
    <input
      type="color"
      // NOTE: Delay calling the provided onChange listener, because sliding the color input
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
      onClick={props.onClick}
      onClickCapture={props.onClickCapture}
      defaultValue={props.defaultValue}
    />
  );
}
