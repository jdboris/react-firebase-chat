import PencilIcon from "@material-ui/icons/Create";
import MenuIcon from "@material-ui/icons/Menu";
import PersonIcon from "@material-ui/icons/Person";
import CloseIcon from "@material-ui/icons/Close";
import firebase from "firebase/app";
import React, { useEffect, useRef, useState } from "react";
import { useCollectionData } from "react-firebase-hooks/firestore";
import { auth, firestore, messagesRef, usersRef as usersRef } from "../app";
import styles from "../css/chat-room.module.css";
import { fonts } from "../fonts";
import { toggleSelectionMarkup } from "../markdown";
import { presence } from "../presence";
import { uploadFile } from "../storage";
// import { getProviders } from "../oembed";
import { ChatMessage } from "./chat-message";
import { ColorInput } from "./color-input";
import { MessageInputForm } from "./message-input-form";
import { MessageList } from "./message-list";
import { SliderInput } from "./slider-input";
import { UserStyleControls } from "./user-style-controls";

export function ChatRoom(props) {
  // Fetch the current user's ID from Firebase Authentication.
  const user = auth.currentUser;
  const [uid, setUid] = useState(user.uid);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [photoURL, setPhotoURL] = useState(user.photoURL);
  uid != user.uid && setUid(user.uid);
  displayName != user.displayName && setDisplayName(user.displayName);
  photoURL != user.photoURL && setPhotoURL(user.photoURL);

  const [isOnline, setIsOnline] = useState(true);
  const [messageValue, setMessageValue] = useState("");
  const [idToken, setIdToken] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);

  const [font, setFont] = useState(fonts[0]);
  const [fontSize, setFontSize] = useState(13);
  const [fontColor, setFontColor] = useState("#000000");
  const [nameColor, setNameColor] = useState("#000000");
  const [msgBgImg, setMsgBgImg] = useState("");
  const [msgBgColor, setMsgBgColor] = useState("#FFFFFF");
  const [msgBgTransparency, setMsgBgTransparency] = useState(1);
  const [msgBgRepeat, setMsgBgRepeat] = useState("no-repeat");
  const [msgBgPosition, setMsgBgPosition] = useState("left");
  const [msgBgImgTransparency, setMsgBgImgTransparency] = useState(1);

  const [userStyles, setUserStyles] = useState(true);

  const [isUsersOpen, setUsersOpen] = useState(false);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isFormatOpen, setFormatOpen] = useState(false);
  const [isFontSizeOpen, setFontSizeOpen] = useState(false);
  const [isStyleEditorOpen, setStyleEditorOpen] = useState(false);
  const [isFontColorOpen, setFontColorOpen] = useState(false);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const [sentMsgCount, setSentMsgCount] = useState(0);

  let messageInput = useRef();

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = messageValue;
    setMessageValue("");

    const { uid, photoURL, displayName } = auth.currentUser;

    await messagesRef.add({
      text: text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      username: displayName,
      uid,
      photoURL,
      isDeleted: false,
      font: font,
      fontSize: fontSize,
      fontColor: fontColor,
      backgroundImage: msgBgImg,
      bgColor: msgBgColor,
      nameColor: nameColor,
      bgTransparency: msgBgTransparency,
      msgBgRepeat: msgBgRepeat,
      msgBgPosition: msgBgPosition,
      msgBgImgTransparency: msgBgImgTransparency,
    });

    setSentMsgCount(sentMsgCount + 1);
  };

  const closeMenus = () => {
    setMenuOpen(false);
    setFontSizeOpen(false);
    setFontColorOpen(false);
  };

  let query = messagesRef
    .limit(25)
    .orderBy("createdAt", "desc")
    .where("isDeleted", "==", false);

  const [messages] = useCollectionData(query, { idField: "id" });

  console.log("RE-RENDER");

  useEffect(() => {
    usersRef
      .doc(uid)
      .get()
      .then((doc) => {
        if (doc.exists) {
          const preferences = doc.data();
          if ("fontSize" in preferences) setFontSize(preferences.fontSize);
          if ("fontColor" in preferences) setFontColor(preferences.fontColor);
          if ("font" in preferences) setFont(preferences.font);
          if ("userStyles" in preferences)
            setUserStyles(preferences.userStyles);
          if ("msgBgImg" in preferences) setMsgBgImg(preferences.msgBgImg);
          if ("nameColor" in preferences) setNameColor(preferences.nameColor);
          if ("msgBgColor" in preferences)
            setMsgBgColor(preferences.msgBgColor);
          if ("msgBgTransparency" in preferences)
            setMsgBgTransparency(preferences.msgBgTransparency);
          if ("msgBgRepeat" in preferences)
            setMsgBgRepeat(preferences.msgBgRepeat);
          if ("msgBgPosition" in preferences)
            setMsgBgPosition(preferences.msgBgPosition);
          if ("msgBgImgTransparency" in preferences)
            setMsgBgImgTransparency(preferences.msgBgImgTransparency);
        }
      });

    presence(setIsOnline);

    firebase
      .firestore()
      .collection("userPresences")
      .where("isOnline", "==", true)
      .onSnapshot(function (snapshot) {
        setOnlineUsers(
          snapshot.docs.map((doc) => {
            return doc.data();
          })
        );
      });

    if (!idToken) {
      auth.currentUser.getIdTokenResult().then((idTokenResult) => {
        setIdToken(idTokenResult);
      });
    }
  }, []);

  useEffect(() => {
    if (!selection) return;
    const { start, end } = selection;
    messageInput.focus();
    messageInput.setSelectionRange(start, end);
  }, [selection]);

  return (
    <section className={styles["chat-section"]} onClickCapture={closeMenus}>
      <MessageList
        messages={messages}
        scrollToBottom={true}
        userStyles={userStyles}
        onMessageClick={(targetUsername) => {
          setMessageValue(messageValue + " @" + targetUsername + " ");
          messageInput.focus();
        }}
        idToken={idToken}
        sentMsgCount={sentMsgCount}
      />

      <UserStyleControls
        open={isFormatOpen}
        enabled={userStyles}
        font={font}
        setFont={setFont}
        isFontSizeOpen={isFontSizeOpen}
        setFontSizeOpen={setFontSizeOpen}
        fontSize={fontSize}
        setFontSize={setFontSize}
        messageInput={messageInput}
        setMessageValue={setMessageValue}
        setStyleEditorOpen={setStyleEditorOpen}
        isStyleEditorOpen={isStyleEditorOpen}
        isFontColorOpen={isFontColorOpen}
        setFontColorOpen={setFontColorOpen}
        fontColor={fontColor}
        setFontColor={setFontColor}
        toggleSelectionMarkup={(symbol) => {
          return toggleSelectionMarkup(messageInput, symbol);
        }}
        setSelection={setSelection}
      />

      <MessageInputForm
        sendMessage={sendMessage}
        messageInput={(input) => {
          messageInput = input;
        }}
        messageValue={messageValue}
        setMessageValue={setMessageValue}
        userStyles={userStyles}
        font={font}
        fontSize={fontSize}
        fontColor={fontColor}
        msgBgImg={msgBgImg}
        msgBgTransparency={msgBgTransparency}
        msgBgColor={msgBgColor}
        msgBgRepeat={msgBgRepeat}
        msgBgPosition={msgBgPosition}
        isFormatOpen={isFormatOpen}
        setFormatOpen={setFormatOpen}
        msgBgImgTransparency={msgBgImgTransparency}
      />

      <div className={styles["chat-controls"]}>
        <span
          className={styles["pointer"]}
          onClick={() => {
            setUsersOpen(!isUsersOpen);
          }}
        >
          {onlineUsers ? onlineUsers.length : 1}
        </span>

        <MenuIcon
          className={styles["pointer"]}
          onClickCapture={() => {
            setMenuOpen(!isMenuOpen);
          }}
        />

        {isMenuOpen && (
          <div className={styles["menu"]}>
            <div
              onClickCapture={() => {
                auth.signOut();
              }}
            >
              Log out
            </div>
            <div
              onClickCapture={() => {
                setProfileOpen(!isProfileOpen);
              }}
            >
              Edit profile
            </div>
          </div>
        )}
      </div>

      {isStyleEditorOpen && (
        <div
          className={styles["dialog"] + " " + styles["message-style-editor"]}
        >
          <div className={styles["dialog-header"]}>
            Message style editor
            <CloseIcon
              onClick={() => {
                setStyleEditorOpen(false);
              }}
            />
          </div>
          <div className={styles["sample-message-wrapper"]}>
            <ChatMessage
              message={{
                text: "Sample message text",
                uid: uid,
                createdAt: new firebase.firestore.Timestamp(
                  1626757369,
                  337000000
                ),
                username: auth.currentUser.displayName,
                fontSize: fontSize,
                fontColor: fontColor,
                font: font,
                backgroundImage: msgBgImg,
                nameColor: nameColor,
                bgColor: msgBgColor,
                bgTransparency: msgBgTransparency,
                msgBgRepeat: msgBgRepeat,
                msgBgPosition: msgBgPosition,
                msgBgImgTransparency: msgBgImgTransparency,
              }}
              idToken={idToken}
              userStyles={userStyles}
              onClick={() => {}}
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
                usersRef.doc(uid).update({
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
                setMsgBgColor(e.target.value);
              }}
              onChangeComplete={(e) => {
                usersRef.doc(uid).update({
                  msgBgColor: e.target.value,
                });
              }}
            />
          </label>
          <label>
            Bg transparency
            <SliderInput
              min="0"
              max="100"
              defaultValue={msgBgTransparency * 100}
              onChange={(e) => {
                setMsgBgTransparency(e.target.value / 100);
              }}
              onChangeComplete={(e) => {
                usersRef.doc(uid).update({
                  msgBgTransparency: e.target.value / 100,
                });
              }}
            />
          </label>
          <label className={styles["button"]}>
            Upload Image
            <input
              type="file"
              onChange={async (e) => {
                const file = e.target.files[0];
                const url = await uploadFile(file);
                if (url) {
                  await firestore.collection("users").doc(uid).update({
                    msgBgImg: url,
                  });
                  console.log(url);
                  setMsgBgImg(url);
                }
              }}
            />
          </label>
          {msgBgImg && (
            <label
              onClick={async (e) => {
                await firestore.collection("users").doc(uid).update({
                  msgBgImg: "",
                });
                setMsgBgImg("");
              }}
              className={styles["button"]}
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
                    const checked = e.target.checked;
                    await firestore
                      .collection("users")
                      .doc(uid)
                      .update({
                        msgBgRepeat: checked ? "repeat" : "no-repeat",
                      });
                    setMsgBgRepeat(checked ? "repeat" : "no-repeat");
                  }}
                  checked={msgBgRepeat == "repeat"}
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
                    checked={msgBgPosition == "left" ? true : false}
                    onChange={async (e) => {
                      const checked = e.target.checked;
                      if (checked) {
                        await firestore.collection("users").doc(uid).update({
                          msgBgPosition: "left",
                        });
                        setMsgBgPosition("left");
                      }
                    }}
                  />
                  Left
                </label>
                <label>
                  <input
                    type="radio"
                    name="msgBgPosition"
                    checked={msgBgPosition == "right" ? true : false}
                    onChange={async (e) => {
                      const checked = e.target.checked;
                      if (checked) {
                        await firestore.collection("users").doc(uid).update({
                          msgBgPosition: "right",
                        });
                        setMsgBgPosition("right");
                      }
                    }}
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
                    setMsgBgImgTransparency(e.target.value / 100);
                  }}
                  onChangeComplete={(e) => {
                    usersRef.doc(uid).update({
                      msgBgImgTransparency: e.target.value / 100,
                    });
                  }}
                />
              </label>
            </>
          )}
        </div>
      )}

      {isUsersOpen && (
        <div className={styles["dialog"]}>
          <div className={styles["dialog-header"]}>
            People here now
            <CloseIcon
              onClick={() => {
                setUsersOpen(false);
              }}
            />
          </div>
          <ul>
            {onlineUsers.map((user) => {
              return <li>{user.username}</li>;
            })}
          </ul>
        </div>
      )}

      {isProfileOpen && (
        <div className={styles["dialog"] + " " + styles["profile-editor"]}>
          <div className={styles["dialog-header"]}>
            Edit profile
            <CloseIcon
              onClick={() => {
                setProfileOpen(false);
              }}
            />
          </div>
          <div>
            <label>
              {photoURL ? (
                <img className={styles["avatar"]} src={photoURL} />
              ) : (
                <PersonIcon className={styles["avatar"]} />
              )}
              {<PencilIcon />}
              <input
                type="file"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  const url = await uploadFile(file);
                  if (url) {
                    await auth.currentUser.updateProfile({ photoURL: url });
                    setPhotoURL(url);
                  }
                }}
              />
            </label>
          </div>
        </div>
      )}

      {!isOnline && (
        <div className={styles["chat-room-overlay"]}>
          <div className={styles["overlay-message"]}>
            <div>Connection failed.</div>
            <div>Reconnecting...</div>
          </div>
        </div>
      )}
    </section>
  );
}
