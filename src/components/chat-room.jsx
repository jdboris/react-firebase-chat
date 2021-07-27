import React, { useRef, useState, useEffect } from "react";
import styles from "../css/chat-room.module.css";
import MenuIcon from "@material-ui/icons/Menu";
import TextFormatIcon from "@material-ui/icons/TextFormat";
import CloseIcon from "@material-ui/icons/Close";
import AddIcon from "@material-ui/icons/Add";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import FormatColorTextIcon from "@material-ui/icons/FormatColorText";
import PencilIcon from "@material-ui/icons/Create";
import PersonIcon from "@material-ui/icons/Person";

import firebase from "firebase/app";
import { firestore, auth } from "../app";

import { useCollectionData } from "react-firebase-hooks/firestore";
import { presence } from "../presence";
// import { getProviders } from "../oembed";
import { ChatMessage } from "./chat-message";
import { ColorInput } from "./color-input";
import { SliderInput } from "./slider-input";
import { toggleSelectionMarkup, MARKUP_SYMBOLS } from "../markdown";
import { uploadFile } from "../storage";
import { fonts } from "../fonts";
import { hexToRgb } from "../color";

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
  const [userStyles, setUserStyles] = useState(true);

  const [isUsersOpen, setUsersOpen] = useState(false);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isFormatOpen, setFormatOpen] = useState(false);
  const [isFontOpen, setFontOpen] = useState(false);
  const [isFontSizeOpen, setFontSizeOpen] = useState(false);
  const [isStyleEditorOpen, setStyleEditorOpen] = useState(false);
  const [isFontColorOpen, setFontColorOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const dummy = useRef();

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
    });

    dummy.current.scrollIntoView({ behavior: "smooth" });
  };

  const closeMenus = () => {
    setMenuOpen(false);
    setFontOpen(false);
    setFontSizeOpen(false);
    setFontColorOpen(false);
  };

  const messagesRef = firestore.collection("messages");
  const bannedUsersRef = firestore.collection("bannedUsers");
  const userPreferencesRef = firestore.collection("userPreferences");

  let query = messagesRef
    .orderBy("createdAt")
    .limit(25)
    .where("isDeleted", "==", false);

  const [messages] = useCollectionData(query, { idField: "id" });

  console.log("RE-RENDER");

  useEffect(() => {
    // getProviders();
    
    userPreferencesRef
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
      <section className={styles["messages-section"]}>
        <span ref={dummy}></span>
        {messages &&
          messages.reverse().map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              userStyles={userStyles}
              onClick={(targetUsername) => {
                setMessageValue(messageValue + " @" + targetUsername + " ");
                messageInput.focus();
              }}
              idToken={idToken}
              messagesRef={messagesRef}
              bannedUsersRef={bannedUsersRef}
            />
          ))}
      </section>

      {isFormatOpen && (
        <div className={styles["format-controls"]}>
          <span
            onClickCapture={() => {
              const newValue = !userStyles;
              userPreferencesRef
                .doc(uid)
                .update({ userStyles: newValue })
                .then(() => {
                  setUserStyles(newValue);
                });
            }}
          >
            {userStyles ? <CloseIcon /> : <AddIcon />}
          </span>
          {userStyles && (
            <>
              <span
                onClickCapture={() => {
                  setFontOpen(!isFontOpen);
                }}
              >
                T<ArrowDropDownIcon className={styles["down-arrow"]} />
                {isFontOpen ? (
                  <div className={styles["menu"]}>
                    {fonts.map((fontObj) => {
                      return (
                        <div
                          className={
                            font.name == fontObj.name ? styles["bold"] : ""
                          }
                          onClickCapture={() => {
                            userPreferencesRef
                              .doc(uid)
                              .update({ font: fontObj })
                              .then(() => {
                                setFont(fontObj);
                              });
                          }}
                        >
                          {fontObj.name}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  ""
                )}
              </span>
              <span
                onClickCapture={() => {
                  setFontSizeOpen(!isFontSizeOpen);
                }}
              >
                {fontSize}
                <ArrowDropDownIcon className={styles["down-arrow"]} />
                {isFontSizeOpen ? (
                  <div className={styles["menu"]}>
                    {[...Array(14).keys()].map((element) => {
                      return (
                        <div
                          onClickCapture={(e) => {
                            userPreferencesRef
                              .doc(uid)
                              .update({
                                fontSize: 9 + element,
                              })
                              .then(() => {
                                setFontSize(9 + element);
                              });
                          }}
                        >
                          {9 + element}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  ""
                )}
              </span>
              <strong
                onClick={() => {
                  let result = toggleSelectionMarkup(
                    messageInput,
                    MARKUP_SYMBOLS.BOLD
                  );

                  setMessageValue(result.value);
                  setSelection({
                    start: result.start,
                    end: result.end,
                  });
                }}
              >
                B
              </strong>
              <em
                onClick={() => {
                  let result = toggleSelectionMarkup(
                    messageInput,
                    MARKUP_SYMBOLS.ITALICS
                  );

                  setMessageValue(result.value);
                  setSelection({
                    start: result.start,
                    end: result.end,
                  });
                }}
              >
                i
              </em>
              <span
                onClickCapture={() => {
                  setStyleEditorOpen(!isStyleEditorOpen);
                }}
              >
                bg
              </span>
              <span
                onClickCapture={() => {
                  setFontColorOpen(!isFontColorOpen);
                }}
              >
                {isFontColorOpen ? (
                  <div
                    className={`${styles["menu"]} ${styles["font-color-picker"]}`}
                  >
                    <div>
                      <ColorInput
                        defaultValue={fontColor}
                        onChange={(e) => {
                          setFontColor(e.target.value);
                        }}
                        onChangeComplete={(e) => {
                          userPreferencesRef.doc(uid).update({
                            fontColor: e.target.value,
                          });
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        // NOTE: Required to prevent auto closing when clicking
                        onClickCapture={() => {
                          setFontColorOpen(true);
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  ""
                )}
                <FormatColorTextIcon
                  className={styles["font-color"]}
                  style={{ color: fontColor }}
                />
              </span>
            </>
          )}
        </div>
      )}

      <form onSubmit={sendMessage}>
        <textarea
          ref={(input) => {
            messageInput = input;
          }}
          autoFocus
          value={messageValue}
          onChange={(e) => setMessageValue(e.target.value)}
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
            userStyles
              ? {
                  fontFamily: font.style,
                  fontSize: fontSize,
                  color: fontColor,
                  backgroundImage: msgBgImg ? `url(${msgBgImg})` : "",
                  backgroundColor: `rgba(${hexToRgb(
                    msgBgColor
                  )},${msgBgTransparency})`,
                }
              : {}
          }
        ></textarea>
        <TextFormatIcon
          className={
            styles["pointer"] + " " + (isFormatOpen ? styles["outlined"] : "")
          }
          onClick={(e) => {
            setFormatOpen(!isFormatOpen);
          }}
        />
      </form>

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
                setIsProfileOpen(!isProfileOpen);
              }}
            >
              Edit profile
            </div>
            <div
              onClickCapture={() => {
                auth.signOut();
              }}
            >
              Log out
            </div>
          </div>
        )}
      </div>

      {isStyleEditorOpen && (
        <div
          className={styles["dialog"] + " " + styles["message-style-editor"]}
        >
          Message style editor
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
                userPreferencesRef.doc(uid).update({
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
                userPreferencesRef.doc(uid).update({
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
                userPreferencesRef.doc(uid).update({
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
                  await firestore
                    .collection("userPreferences")
                    .doc(uid)
                    .update({
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
                await firestore.collection("userPreferences").doc(uid).update({
                  msgBgImg: "",
                });
                setMsgBgImg("");
              }}
              className={styles["button"]}
            >
              Clear Image
            </label>
          )}
        </div>
      )}

      {isUsersOpen && (
        <div className={styles["dialog"]}>
          People here now
          <ul>
            {onlineUsers.map((user) => {
              return <li>{user.username}</li>;
            })}
          </ul>
        </div>
      )}

      {isProfileOpen && (
        <div className={styles["dialog"] + " " + styles["profile-editor"]}>
          Edit profile
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
