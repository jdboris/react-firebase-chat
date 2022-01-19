import { CameraAlt as CameraIcon } from "@mui/icons-material";
import { SentimentVerySatisfied as SmileIcon } from "@mui/icons-material";
import { TextFormat as TextFormatIcon } from "@mui/icons-material";
import React, { useState } from "react";
import { hexToRgb } from "../utils/color";
import styles from "../css/chat-room.module.css";
import { translateError } from "../utils/errors";
import { MARKUP_SYMBOLS } from "../utils/markdown";
import { uploadFile } from "../utils/storage";
import { timeout } from "../utils/utils";

export const MessageInputForm = React.forwardRef((props, messageInput) => {
  const [loading, setLoading] = useState(false);
  // Cap the font size for non-premium users
  const fontSize = !props.premium && props.fontSize >= 15 ? 15 : props.fontSize;

  async function uploadFileWithHandlers(e, file) {
    if (loading || !file) return;
    setLoading(true);
    try {
      await timeout(20000, async () => {
        const url = await uploadFile(file);

        if (!url) {
          throw new Error("Error uploading file.");
        }

        props.setMessageValue(props.messageValue + " " + url + " ");
      });
    } catch (error) {
      props.setErrors([translateError(error).message]);
    } finally {
      setLoading(false);
      e.target.form.message.focus();
    }
  }

  return (
    <form
      className={styles["message-form"]}
      onSubmit={props.sendMessage}
      onFocus={(e) => {
        if (!props.userId) {
          e.preventDefault();
          e.target.blur();
          props.setLoginOpen(true);
        }
      }}
    >
      <label className={!loading ? styles["pointer"] : ""}>
        <div className={loading ? styles["loading-placeholder"] : ""}>
          <CameraIcon className={styles["camera-icon"] + " "} />
        </div>

        <input
          type="file"
          onChange={async (e) => {
            await uploadFileWithHandlers(e, e.target.files[0]);
            e.target.value = "";
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
          disabled={loading}
          className={`${loading ? styles["loading"] : ""} ${
            props.messageErrorFlash ? styles["error-flash"] : ""
          }`}
          ref={messageInput}
          autoFocus
          value={props.messageValue}
          onChange={(e) => props.setMessageValue(e.target.value)}
          placeholder="Type here to send a message"
          onPaste={async (e) => {
            if (e.clipboardData.files.length) {
              await uploadFileWithHandlers(e, e.clipboardData.files[0]);
            }
          }}
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
});
