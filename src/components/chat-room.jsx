import CloseIcon from "@material-ui/icons/Close";
import PencilIcon from "@material-ui/icons/Create";
import GavelIcon from "@material-ui/icons/Gavel";
import MenuIcon from "@material-ui/icons/Menu";
import PersonIcon from "@material-ui/icons/Person";
import firebase from "firebase/app";
import React, { useEffect, useRef, useState } from "react";
import { useCollectionData, useDocument } from "react-firebase-hooks/firestore";
import { auth, messagesRef, usersRef as usersRef } from "../app";
import styles from "../css/chat-room.module.css";
import { fonts } from "../fonts";
import { toggleSelectionMarkup } from "../markdown";
import { presence } from "../presence";
import { uploadFile } from "../storage";
import { insertIntoInput } from "../utils";
import { BanlistDialog } from "./banlist-dialog";
// import { getProviders } from "../oembed";
import { ChatMessage } from "./chat-message";
import { ColorInput } from "./color-input";
import { EmojiSelector } from "./emoji-selector";
import { MenuWithButton } from "./menu-with-button";
import { MessageInputForm } from "./message-input-form";
import { MessageList } from "./message-list";
import { ModActionLogDialog } from "./mod-action-log-dialog";
import { ModeratorsDialog } from "./moderators-dialog";
import { SliderInput } from "./slider-input";
import { UserStyleControls } from "./user-style-controls";

export function ChatRoom(props) {
  // Fetch the current user's ID from Firebase Authentication.
  const authUser = props.user;
  const [userSnapshot, isLoadingUser, error] = useDocument(
    usersRef.doc(authUser.uid)
  );

  const user = userSnapshot
    ? {
        uid: authUser.uid,
        photoUrl: authUser.photoURL,
        email: authUser.email,
        ...userSnapshot.data(),
      }
    : {
        uid: authUser.uid,
        photoUrl: authUser.photoURL,
        email: authUser.email,
      };

  // const [uid, setUid] = useState(user.uid);
  // const [displayName, setDisplayName] = useState(user.displayName);
  const [photoURL, setPhotoURL] = useState(user.photoURL);
  // uid != user.uid && setUid(user.uid);
  // displayName != user.displayName && setDisplayName(user.displayName);
  // photoURL != user.photoURL && setPhotoURL(user.photoURL);

  const [isOnline, setIsOnline] = useState(true);
  const [messageValue, setMessageValue] = useState("");
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
  const [isBanlistOpen, setBanlistOpen] = useState(false);
  const [isModsOpen, setModsOpen] = useState(false);
  const [isModActionLogOpen, setModActionLogOpen] = useState(false);
  const [menuOpenKey, setMenuOpenKey] = useState(0);
  const [isEmojisOpen, setEmojisOpen] = useState(false);
  const [isFormatOpen, setFormatOpen] = useState(false);
  const [isStyleEditorOpen, setStyleEditorOpen] = useState(false);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const [sentMsgCount, setSentMsgCount] = useState(0);

  let messageInput = useRef();

  const sendMessage = async (e) => {
    if (messageValue) {
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
    }
  };

  const closeMenus = () => {
    setMenuOpenKey(menuOpenKey + 1);
  };

  const query = messagesRef
    .limit(25)
    .orderBy("createdAt", "desc")
    .where("isDeleted", "==", false);

  const [messages] = useCollectionData(query, { idField: "id" });

  console.log("RE-RENDER");

  useEffect(() => {
    usersRef
      .doc(user.uid)
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
        sentMsgCount={sentMsgCount}
        currentUser={user}
      />

      <UserStyleControls
        open={isFormatOpen}
        menuOpenKey={menuOpenKey}
        setMenuOpenKey={setMenuOpenKey}
        enabled={userStyles}
        font={font}
        setFont={setFont}
        fontSize={fontSize}
        setFontSize={setFontSize}
        messageInput={messageInput}
        setMessageValue={setMessageValue}
        setStyleEditorOpen={setStyleEditorOpen}
        isStyleEditorOpen={isStyleEditorOpen}
        fontColor={fontColor}
        setFontColor={setFontColor}
        toggleSelectionMarkup={(symbol) => {
          return toggleSelectionMarkup(messageInput, symbol);
        }}
        setSelection={setSelection}
      />

      <MessageInputForm
        sendMessage={sendMessage}
        setMessageInput={(input) => {
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
        isEmojisOpen={isEmojisOpen}
        setEmojisOpen={setEmojisOpen}
        isFormatOpen={isFormatOpen}
        setFormatOpen={setFormatOpen}
        msgBgImgTransparency={msgBgImgTransparency}
      />

      <div className={styles["chat-controls"]}>
        <span
          className={styles["pointer"] + " " + styles["user-count"]}
          onClick={() => {
            setUsersOpen(!isUsersOpen);
          }}
        >
          {onlineUsers ? onlineUsers.length : 1}
        </span>

        {user.isModerator && (
          <MenuWithButton
            button={<GavelIcon className={styles["gavel-icon"]} />}
            openKey={menuOpenKey}
            items={{
              "Manage Moderators": () => {
                setModsOpen(!isModsOpen);
              },
              Banlist: () => {
                setBanlistOpen(!isBanlistOpen);
              },
              ...(user.isAdmin
                ? {
                    "Mod Action Log": () => {
                      setModActionLogOpen(!isModActionLogOpen);
                    },
                  }
                : {}),
            }}
          />
        )}

        <MenuWithButton
          button={<MenuIcon />}
          openKey={menuOpenKey}
          items={{
            "Log out": () => {
              auth.signOut();
            },
            "Edit profile": () => {
              setProfileOpen(!isProfileOpen);
            },
          }}
        />
      </div>

      {isStyleEditorOpen && (
        <div
          className={styles["dialog"] + " " + styles["message-style-editor"]}
        >
          <header>
            Message style editor
            <CloseIcon
              onClick={() => {
                setStyleEditorOpen(false);
              }}
            />
          </header>
          <div className={styles["sample-message-wrapper"]}>
            <ChatMessage
              message={{
                text: "Sample message text",
                uid: user.uid,
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
              userStyles={userStyles}
              onClick={() => {}}
              currentUser={user}
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
                setMsgBgColor(e.target.value);
              }}
              onChangeComplete={(e) => {
                usersRef.doc(user.uid).update({
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
                usersRef.doc(user.uid).update({
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
                  await usersRef.doc(user.uid).update({
                    msgBgImg: url,
                  });
                  setMsgBgImg(url);
                }
              }}
            />
          </label>
          {msgBgImg && (
            <label
              onClick={async (e) => {
                await usersRef.doc(user.uid).update({
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
                    await usersRef.doc(user.uid).update({
                      msgBgRepeat: checked ? "repeat" : "no-repeat",
                    });

                    setMsgBgRepeat(checked ? "repeat" : "no-repeat");
                  }}
                  defaultChecked={msgBgRepeat == "repeat"}
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
                    defaultChecked={msgBgPosition == "left"}
                    onChange={async (e) => {
                      const checked = e.target.checked;
                      if (checked) {
                        await usersRef.doc(user.uid).update({
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
                    defaultChecked={msgBgPosition == "right"}
                    onChange={async (e) => {
                      const checked = e.target.checked;
                      if (checked) {
                        await usersRef.doc(user.uid).update({
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
                    usersRef.doc(user.uid).update({
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
          <header>
            People here now
            <CloseIcon
              onClick={() => {
                setUsersOpen(false);
              }}
            />
          </header>
          <ul>
            {onlineUsers.map((user) => {
              return <li>{user.username}</li>;
            })}
          </ul>
        </div>
      )}

      <ModeratorsDialog
        open={isModsOpen}
        requestClose={() => {
          setModsOpen(false);
        }}
      />

      <BanlistDialog
        open={isBanlistOpen}
        requestClose={() => {
          setBanlistOpen(false);
        }}
      />

      <ModActionLogDialog
        open={isModActionLogOpen}
        requestClose={() => {
          setModActionLogOpen(false);
        }}
      />

      {/* NOTE: Hide with class to avoid expensive re-rendering */}
      <div
        className={
          styles["dialog"] + " " + (isEmojisOpen ? "" : styles["hidden"])
        }
      >
        <header>
          Emojis
          <CloseIcon
            onClick={() => {
              setEmojisOpen(false);
            }}
          />
        </header>
        <div>
          <EmojiSelector
            onSelect={(emojiChar) => {
              messageInput.focus();
              insertIntoInput(emojiChar + " ", messageInput);
              setMessageValue(messageInput.value);
            }}
            messageValue={messageValue}
            setMessageValue={setMessageValue}
            messageInput={messageInput}
            shouldComponentUpdate={false}
          />
        </div>
      </div>

      {isProfileOpen && (
        <div className={styles["dialog"] + " " + styles["profile-editor"]}>
          <header>
            Edit profile
            <CloseIcon
              onClick={() => {
                setProfileOpen(false);
              }}
            />
          </header>
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
