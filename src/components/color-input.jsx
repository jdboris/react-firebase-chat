import React, { useRef, useState, useEffect } from "react";
import styles from "../css/chat-room.module.css";
import MenuIcon from "@material-ui/icons/Menu";
import TextFormatIcon from "@material-ui/icons/TextFormat";
import CloseIcon from "@material-ui/icons/Close";
import AddIcon from "@material-ui/icons/Add";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import FormatColorTextIcon from "@material-ui/icons/FormatColorText";

import firebase from "firebase/app";
import { firestore, auth, storage } from "../app";

import { useCollectionData } from "react-firebase-hooks/firestore";
import { presence } from "../presence";
// import { getProviders } from "../oembed";
import { ChatMessage } from "./chat-message";
import { toggleSelectionMarkup, MARKUP_SYMBOLS } from "../markdown";

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
