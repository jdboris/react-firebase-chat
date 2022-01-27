import { CameraAlt as CameraIcon } from "@mui/icons-material";
import { SentimentVerySatisfied as SmileIcon } from "@mui/icons-material";
import { TextFormat as TextFormatIcon } from "@mui/icons-material";
import React, { useState } from "react";
import { hexToRgb } from "../utils/color";
import styles from "../css/chat-room.module.css";
import userSelectCss from "./user-select/user-select.module.css";
import { translateError } from "../utils/errors";
import { MARKUP_SYMBOLS } from "../utils/markdown";
import { uploadFile } from "../utils/storage";
import { timeout, insertIntoInput } from "../utils/utils";
import { position, offset } from "caret-pos";
import { UserSelect } from "./user-select/user-select";

export const MessageInputForm = React.forwardRef((props, messageInput) => {
  const [loading, setLoading] = useState(false);
  const [caretX, setCaretX] = useState(0);
  const [caretY, setCaretY] = useState(0);
  const [mentionValue, setMentionValue] = useState(null);

  function checkForMention(input) {
    const mentionName = getMentionName(input);

    if (mentionName !== null) {
      const startPosition = position(messageInput.current, {
        customPos: input.selectionStart - mentionName.length,
      });
      setCaretX(startPosition.left);
      setCaretY(startPosition.top);
    }

    setMentionValue(mentionName);
  }

  function getMentionName(
    input,
    start = input.selectionStart,
    end = input.selectionEnd
  ) {
    if (start != end) return null;

    const value = input.value;
    let mentionName = "";

    for (let i = start - 1; i >= 0; i--) {
      const character = value.charAt(i);
      // Whitespace
      if (/\s/.test(character)) {
        return null;
      }

      if (character === "@") {
        return mentionName;
      }

      mentionName = character + mentionName;
    }

    return null;
  }

  function replaceMentionAtCaret(input, newMention) {
    let [start, end] = [input.selectionStart, input.selectionEnd];
    const value = input.value;

    // While not a '@' before
    while (value[start - 1] && value[start - 1] !== "@") {
      start--;
    }

    // While not a whitespace next
    while (value[end] && !/\s/.test(value[end])) {
      end++;
    }

    return value.substr(0, start) + newMention + value.substr(end);
  }

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
          onChange={(e) => {
            props.setMessageValue(e.target.value);

            checkForMention(e.target);
          }}
          onClickCapture={(e) => {
            checkForMention(e.target);
          }}
          placeholder="Type here to send a message"
          onPaste={async (e) => {
            if (e.clipboardData.files.length) {
              await uploadFileWithHandlers(e, e.clipboardData.files[0]);
            }
          }}
          onKeyUp={(e) => {
            checkForMention(e.target);
          }}
          onKeyDown={(e) => {
            if (mentionValue !== null) {
              if (
                e.key === "ArrowDown" ||
                e.key === "ArrowUp" ||
                e.key === "Enter" ||
                e.key === "Tab" ||
                e.key === "Escape"
              ) {
                e.preventDefault();
                // DISCLAIMER: Bad practice (querySelector)
                // Forward the event to the select
                messageInput.current.parentElement
                  .querySelector(`.${userSelectCss.userSelect}`)
                  .dispatchEvent(new KeyboardEvent(e.type, e.nativeEvent));
                return;
              }
            }

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
          onFocus={(e) => {
            checkForMention(e.target);
          }}
          onBlur={(e) => {
            // setMentionValue(null);
          }}
          onKeyPress={(e) => {
            checkForMention(e.target);

            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.target.form.dispatchEvent(
                new Event("submit", {
                  cancelable: true,
                  // BUGFIX: https://github.com/final-form/react-final-form/issues/878#issuecomment-745364350
                  bubbles: true,
                })
              );
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
        {mentionValue !== null && props.onlineUsers && (
          <UserSelect
            users={props.onlineUsers}
            style={{ left: caretX, top: caretY, fontSize }}
            value={mentionValue}
            onChange={(item) => {
              props.setMessageValue(
                replaceMentionAtCaret(messageInput.current, item.label) + " "
              );
              setMentionValue(null);
              messageInput.current.focus();
            }}
            onCancel={(e) => {
              setMentionValue(null);
              messageInput.current.focus();
            }}
          />
        )}
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
