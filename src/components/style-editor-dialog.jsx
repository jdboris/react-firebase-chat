import CloseIcon from "@material-ui/icons/Close";
import firebase from "firebase/app";
import { default as React } from "react";
import { usersRef as usersRef } from "../app";
import styles from "../css/chat-room.module.css";
import { uploadFile } from "../storage";
import { ChatMessage } from "./chat-message";
import { ColorInput } from "./color-input";
import { SliderInput } from "./slider-input";

export function StyleEditorDialog(props) {
  const {
    user,
    premium,
    requestClose,
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
  //     ? usersRef.orderBy("username").where("isBanned", "==", true)
  //     : null;
  //   const [bannedUsers] = useCollectionData(query, { idField: "id" });

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
        <label>
          Bg color
          <ColorInput
            defaultValue={msgBgColor}
            onChange={(e) => {
              if (!premium) return;
              setMsgBgColor(e.target.value);
            }}
            onChangeComplete={(e) => {
              if (!premium) return;
              usersRef.doc(user.uid).update({
                msgBgColor: e.target.value,
              });
            }}
            disabled={!premium}
          />
        </label>
        <label>
          Bg transparency
          <SliderInput
            min="0"
            max="100"
            defaultValue={msgBgTransparency * 100}
            onChange={(e) => {
              if (!premium) return;
              setMsgBgTransparency(e.target.value / 100);
            }}
            onChangeComplete={(e) => {
              if (!premium) return;
              usersRef.doc(user.uid).update({
                msgBgTransparency: e.target.value / 100,
              });
            }}
            disabled={!premium}
          />
        </label>
        <label
          className={
            styles["button"] + " " + (!premium ? styles["disabled"] : "")
          }
        >
          Upload Image
          <input
            type="file"
            onChange={async (e) => {
              if (!premium) return;
              if (e.target.files.length) {
                const file = e.target.files[0];
                const url = await uploadFile(file);
                if (url) {
                  await usersRef.doc(user.uid).update({
                    msgBgImg: url,
                  });
                  setMsgBgImg(url);
                }
              }
            }}
            disabled={!premium}
          />
        </label>
        {msgBgImg && (
          <label
            onClick={async (e) => {
              if (!premium) return;
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
            <label>
              <input
                type="checkbox"
                onChange={async (e) => {
                  if (!premium) return;
                  const checked = e.target.checked;
                  await usersRef.doc(user.uid).update({
                    msgBgRepeat: checked ? "repeat" : "no-repeat",
                  });

                  setMsgBgRepeat(checked ? "repeat" : "no-repeat");
                }}
                defaultChecked={msgBgRepeat == "repeat"}
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
              <label>
                <input
                  type="radio"
                  name="msgBgPosition"
                  defaultChecked={msgBgPosition == "left 0px top 0px"}
                  onChange={async (e) => {
                    if (!premium) return;
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
              <label>
                <input
                  type="radio"
                  name="msgBgPosition"
                  defaultChecked={msgBgPosition == "right 0px top 0px"}
                  onChange={async (e) => {
                    if (!premium) return;
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
            <label>
              Image transparency
              <SliderInput
                min="0"
                max="100"
                defaultValue={msgBgImgTransparency * 100}
                onChange={(e) => {
                  if (!premium) return;
                  setMsgBgImgTransparency(e.target.value / 100);
                }}
                onChangeComplete={(e) => {
                  if (!premium) return;
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
