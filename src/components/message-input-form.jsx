import { default as React } from "react";
import CameraIcon from "@material-ui/icons/CameraAlt";
import TextFormatIcon from "@material-ui/icons/TextFormat";
import { hexToRgb } from "../color";
import styles from "../css/chat-room.module.css";
import { uploadFile } from "../storage";

export function MessageInputForm(props) {
  return (
    <form className={styles["message-form"]} onSubmit={props.sendMessage}>
      <label>
        <CameraIcon
          className={styles["camera-icon"] + " " + styles["pointer"]}
        />
        <input
          type="file"
          onChange={async (e) => {
            const file = e.target.files[0];
            const url = await uploadFile(file);
            if (url) {
              props.setMessageValue(props.messageValue + " " + url);
            }
          }}
        />
      </label>

      <div
        className={styles["input-wrapper"]}
        style={
          props.userStyles
            ? {
                backgroundColor: `rgba(${hexToRgb(props.msgBgColor)},${
                  props.msgBgTransparency
                })`,
              }
            : {}
        }
      >
        <div
          className={styles["message-background-image"]}
          style={
            props.userStyles
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
          ref={(input) => {
            props.messageInput(input);
          }}
          autoFocus
          value={props.messageValue}
          onChange={(e) => props.setMessageValue(e.target.value)}
          placeholder="Type here to send a message"
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
            props.userStyles
              ? {
                  fontFamily: props.font.style,
                  fontSize: props.fontSize,
                  color: props.fontColor,
                }
              : {}
          }
        ></textarea>
      </div>

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
