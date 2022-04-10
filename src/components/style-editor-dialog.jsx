import { Close as CloseIcon } from "@mui/icons-material";
import firebase from "firebase/compat/app";
import { default as React, useState } from "react";
import styles from "../css/chat-room.module.css";
import { CustomError } from "../utils/errors";
import { uploadFile } from "../utils/storage";
import { timeout } from "../utils/utils";
import { ChatMessage } from "./chat-message";
import { usersRef } from "./chat-room-app";
import { ColorInput } from "./color-input";
import { SliderInput } from "./slider-input";

export function StyleEditorDialog(props) {
  const {
    user,
    premium,
    requestClose,
    setPremiumPromptOpen,
    messagesRef,
    fontSize,
    fontColor,
    font,
    msgBgImg,
    nameColor,
    msgBgColor,
    msgBgTransparency,
    msgBgRepeat,
    msgBgPosition,
    msgBgImgTransparency,
    stylesEnabled,
    setNameColor,
    setMsgBgColor,
    setMsgBgTransparency,
    setMsgBgImg,
    setMsgBgRepeat,
    setMsgBgPosition,
    setMsgBgImgTransparency,
  } = props;
  //   const [username, setUsername] = useState("");
  //   const query = props.open
  //     ? usersRef.orderBy("lowercaseUsername").where("isBanned", "==", true).withConverter(idConverter)
  //     : null;
  //   const [bannedUsers] = useCollectionData(query);
  const [loading, setLoading] = useState(false);

  return (
    props.open && (
      <div className={styles["dialog"] + " " + styles["message-style-editor"]}>
        <header>
          Message style editor
          <CloseIcon
            onClick={() => {
              requestClose();
            }}
          />
        </header>
        <div className={styles["sample-message-wrapper"]}>
          <ChatMessage
            message={{
              text: "Sample message text",
              uid: user.uid,
              createdAt: new firebase.firestore.Timestamp(
                1726757369,
                337000000
              ),
              username: user.username,
              fontSize,
              fontColor,
              font,
              backgroundImage: msgBgImg,
              nameColor: nameColor,
              bgColor: msgBgColor,
              bgTransparency: msgBgTransparency,
              msgBgRepeat: msgBgRepeat,
              msgBgPosition: msgBgPosition,
              msgBgImgTransparency: msgBgImgTransparency,
            }}
            stylesEnabled={stylesEnabled}
            onClick={() => {}}
            currentUser={user}
            messagesRef={messagesRef}
          />
        </div>
        <label>
          Name color
          <ColorInput
            defaultValue={nameColor}
            onChange={(e) => {
              setNameColor(e.target.value);
            }}
            onChangeComplete={(e) => {
              usersRef.doc(user.uid).update({
                nameColor: e.target.value,
              });
            }}
          />
        </label>
        <label
          onClick={() => {
            if (!premium) return setPremiumPromptOpen(true);
          }}
        >
          Bg color
          <ColorInput
            defaultValue={msgBgColor}
            onChange={(e) => {
              setMsgBgColor(e.target.value);
            }}
            onChangeComplete={(e) => {
              usersRef.doc(user.uid).update({
                msgBgColor: e.target.value,
              });
            }}
            disabled={!premium}
          />
        </label>
        <label
          onClick={() => {
            if (!premium) return setPremiumPromptOpen(true);
          }}
        >
          Bg transparency
          <SliderInput
            min="0"
            max="100"
            defaultValue={msgBgTransparency * 100}
            onChange={(e) => {
              setMsgBgTransparency(e.target.value / 100);
            }}
            onChangeComplete={(e) => {
              usersRef.doc(user.uid).update({
                msgBgTransparency: e.target.value / 100,
              });
            }}
            disabled={!premium}
          />
        </label>
        <label>
          <label
            className={
              styles["button"] +
              " " +
              (!premium ? styles["disabled"] : "") +
              " " +
              (loading ? styles["loading"] : "")
            }
            onClick={() => {
              if (!premium) return setPremiumPromptOpen(true);
            }}
          >
            Upload Image
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
                    throw new CustomError("Error uploading file.");
                  }
                  await usersRef.doc(user.uid).update({
                    msgBgImg: url,
                  });
                  setMsgBgImg(url);
                })
                  .catch((error) => {
                    props.setErrors([new CustomError(error.message, error)]);
                  })
                  .finally(() => {
                    setLoading(false);
                  });
              }}
              disabled={!premium}
            />
          </label>
        </label>
        {msgBgImg && (
          <label
            onClick={async (e) => {
              if (!premium) return setPremiumPromptOpen(true);
              await usersRef.doc(user.uid).update({
                msgBgImg: "",
              });
              setMsgBgImg("");
            }}
            className={
              styles["button"] + " " + (!premium ? styles["disabled"] : "")
            }
          >
            Clear Image
          </label>
        )}
        <div>
          {msgBgImg && (
            <label
              onClick={() => {
                if (!premium) return setPremiumPromptOpen(true);
              }}
            >
              <input
                type="checkbox"
                onChange={async (e) => {
                  const checked = e.target.checked;
                  await usersRef.doc(user.uid).update({
                    msgBgRepeat: checked ? "repeat" : "no-repeat",
                  });

                  setMsgBgRepeat(checked ? "repeat" : "no-repeat");
                }}
                defaultChecked={msgBgRepeat === "repeat"}
                disabled={!premium}
              />
              Tile image
            </label>
          )}
        </div>
        {msgBgImg && (
          <>
            <div>
              Align image
              <label
                onClick={() => {
                  if (!premium) return setPremiumPromptOpen(true);
                }}
              >
                <input
                  type="radio"
                  name="msgBgPosition"
                  defaultChecked={msgBgPosition === "left 0px top 0px"}
                  onChange={async (e) => {
                    const checked = e.target.checked;
                    if (checked) {
                      await usersRef.doc(user.uid).update({
                        msgBgPosition: "left 0px top 0px",
                      });
                      setMsgBgPosition("left 0px top 0px");
                    }
                  }}
                  disabled={!premium}
                />
                Left
              </label>
              <label
                onClick={() => {
                  if (!premium) return setPremiumPromptOpen(true);
                }}
              >
                <input
                  type="radio"
                  name="msgBgPosition"
                  defaultChecked={msgBgPosition === "right 0px top 0px"}
                  onChange={async (e) => {
                    const checked = e.target.checked;
                    if (checked) {
                      await usersRef.doc(user.uid).update({
                        msgBgPosition: "right 0px top 0px",
                      });
                      setMsgBgPosition("right 0px top 0px");
                    }
                  }}
                  disabled={!premium}
                />
                Right
              </label>
            </div>
            <label
              onClick={() => {
                if (!premium) return setPremiumPromptOpen(true);
              }}
            >
              Image transparency
              <SliderInput
                min="0"
                max="100"
                defaultValue={msgBgImgTransparency * 100}
                onChange={(e) => {
                  setMsgBgImgTransparency(e.target.value / 100);
                }}
                onChangeComplete={(e) => {
                  usersRef.doc(user.uid).update({
                    msgBgImgTransparency: e.target.value / 100,
                  });
                }}
                disabled={!premium}
              />
            </label>
          </>
        )}
      </div>
    )
  );
}
