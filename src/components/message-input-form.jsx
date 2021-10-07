import CameraIcon from "@material-ui/icons/CameraAlt";
import SmileIcon from "@material-ui/icons/SentimentVerySatisfied";
import TextFormatIcon from "@material-ui/icons/TextFormat";
import React, { useState } from "react";
import { hexToRgb } from "../utils/color";
import styles from "../css/chat-room.module.css";
import { translateError } from "../utils/errors";
import { MARKUP_SYMBOLS } from "../utils/markdown";
import { uploadFile } from "../utils/storage";
import { timeout } from "../utils/utils";

export function MessageInputForm(props) {
  const [loading, setLoading] = useState(false);
  // Cap the font size for non-premium users
  const fontSize = !props.premium && props.fontSize >= 15 ? 15 : props.fontSize;

  return (
    <form className={styles["message-form"]} onSubmit={props.sendMessage}>
      <label className={!loading ? styles["pointer"] : ""}>
        <div className={loading ? styles["loading-placeholder"] : ""}>
          <CameraIcon className={styles["camera-icon"] + " "} />
        </div>

        <input
          type="file"
          onChange={(e) => {
            if (loading) return;
            setLoading(true);
            timeout(5000, async () => {
              if (!e.target.files.length) {
                return;
              }

              const file = e.target.files[0];
              const url = await uploadFile(file);

              if (!url) {
                throw new Error("Error uploading file.");
              }

              e.target.form.message.focus();
              props.setMessageValue(props.messageValue + " " + url + " ");
            })
              .catch((error) => {
                props.setErrors([translateError(error).message]);
              })
              .finally(() => {
                setLoading(false);
                e.target.value = "";
              });
          }}
        />
      </label>

      <div
        className={styles["input-wrapper"]}
        style={
          props.stylesEnabled && props.premium
            ? {
                backgroundColor: `rgba(${hexToRgb(props.msgBgColor)},${
                  props.msgBgTransparency
                })`,
              }
            : {
                backgroundColor: `white`,
              }
        }
      >
        <div
          className={styles["message-background-image"]}
          style={
            props.stylesEnabled && props.premium
              ? {
                  backgroundImage: `url(${props.msgBgImg})`,
                  backgroundRepeat: props.msgBgRepeat,
                  backgroundPosition: props.msgBgPosition,
                  opacity: props.msgBgImgTransparency,
                }
              : {}
          }
        ></div>
        <textarea
          name="message"
          ref={(input) => {
            props.setMessageInput(input);
          }}
          autoFocus
          value={props.messageValue}
          onChange={(e) => props.setMessageValue(e.target.value)}
          placeholder="Type here to send a message"
          onKeyDown={(e) => {
            if ((e.key === "b" || e.key === "B") && e.ctrlKey) {
              const result = props.toggleSelectionMarkup(MARKUP_SYMBOLS.BOLD);

              props.setMessageValue(result.value);
              props.setSelection({
                start: result.start,
                end: result.end,
              });
            } else if ((e.key === "i" || e.key === "I") && e.ctrlKey) {
              const result = props.toggleSelectionMarkup(
                MARKUP_SYMBOLS.ITALICS
              );

              props.setMessageValue(result.value);
              props.setSelection({
                start: result.start,
                end: result.end,
              });
            }
          }}
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.target.form.dispatchEvent(
                new Event("submit", {
                  cancelable: true,
                  // BUGFIX: https://github.com/final-form/react-final-form/issues/878#issuecomment-745364350
                  bubbles: true,
                })
              );
              e.preventDefault();
            }
          }}
          style={
            props.stylesEnabled
              ? {
                  fontFamily: props.font.style,
                  fontSize: fontSize,
                  color: props.fontColor,
                }
              : {}
          }
        ></textarea>
      </div>
      <SmileIcon
        className={
          styles["pointer"] +
          " " +
          (props.isEmojisOpen ? styles["outlined"] : "")
        }
        onClick={(e) => {
          props.setEmojisOpen(!props.isEmojisOpen);
        }}
      />
      <TextFormatIcon
        className={
          styles["pointer"] +
          " " +
          (props.isFormatOpen ? styles["outlined"] : "")
        }
        onClick={(e) => {
          props.setFormatOpen(!props.isFormatOpen);
        }}
      />
    </form>
  );
}
