import ChatBubbleIcon from "@material-ui/icons/ChatBubble";
import CloseIcon from "@material-ui/icons/Close";
import PencilIcon from "@material-ui/icons/Create";
import GavelIcon from "@material-ui/icons/Gavel";
import MenuIcon from "@material-ui/icons/Menu";
import PersonIcon from "@material-ui/icons/Person";
import firebase from "firebase/app";
import React, { useEffect, useRef, useState } from "react";
import { useCollectionData, useDocument } from "react-firebase-hooks/firestore";
import { auth, conversationsRef, usersRef } from "../app";
import styles from "../css/chat-room.module.css";
import { fonts } from "../fonts";
import { toggleSelectionMarkup } from "../markdown";
import { presence } from "../presence";
import { uploadFile } from "../storage";
import { insertIntoInput } from "../utils";
import { BanlistDialog } from "./banlist-dialog";
// import { getProviders } from "../oembed";
import { DmsDialog } from "./dms-dialog";
import { EmojiSelector } from "./emoji-selector";
import { FilteredWordsDialog } from "./filtered-words-dialog";
import { MenuWithButton } from "./menu-with-button";
import { MessageInputForm } from "./message-input-form";
import { MessageList } from "./message-list";
import { ModActionLogDialog } from "./mod-action-log-dialog";
import { ModeratorsDialog } from "./moderators-dialog";
import { PremiumDialog } from "./premium-dialog";
import { StyleEditorDialog } from "./style-editor-dialog";
import { UserStyleControls } from "./user-style-controls";

export function ChatRoom(props) {
  const sendMessageCloud = firebase.functions().httpsCallable("sendMessage");
  const messagesRef = props.messagesRef;

  // Fetch the current user's ID from Firebase Authentication.
  const authUser = props.user;
  const [userSnapshot, isLoadingUser] = useDocument(usersRef.doc(authUser.uid));

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

  const dmsPerPage = 10;
  let query = user
    ? conversationsRef
        .where("userIds", "array-contains", user.uid)
        .orderBy("lastMessageSentAt", "desc")
        .limit(dmsPerPage)
    : null;
  const [conversations] = useCollectionData(query, {
    idField: "id",
  });

  const unreadCount = conversations
    ? conversations.reduce((unreadCount, conversation) => {
        const lastReadAt = conversation.users[user.uid].lastReadAt;
        let isUnread = false;

        // NOTE: lastReadAt will be null from latency compensation
        if (lastReadAt !== null) {
          isUnread = conversation.lastMessageSentAt > lastReadAt;
        }
        return isUnread ? unreadCount + 1 : unreadCount;
      }, 0)
    : 0;

  const [premium, setPremium] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [messageValue, setMessageValue] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);

  const [photoURL, setPhotoURL] = useState(user.photoURL);
  const [font, setFont] = useState(fonts[0]);
  const [fontSize, setFontSize] = useState(13);
  const [fontColor, setFontColor] = useState("#000000");
  const [nameColor, setNameColor] = useState("#000000");
  const [msgBgImg, setMsgBgImg] = useState("");
  const [msgBgColor, setMsgBgColor] = useState("#FFFFFF");
  const [msgBgTransparency, setMsgBgTransparency] = useState(1);
  const [msgBgRepeat, setMsgBgRepeat] = useState("no-repeat");
  const [msgBgPosition, setMsgBgPosition] = useState("left 0px top 0px");
  const [msgBgImgTransparency, setMsgBgImgTransparency] = useState(1);

  const [stylesEnabled, setStylesEnabled] = useState(true);

  const [isPremiumOpen, setPremiumOpen] = useState(false);
  const [isDmsOpen, setDmsOpen] = useState(false);
  const [isUsersOpen, setUsersOpen] = useState(false);
  const [isBanlistOpen, setBanlistOpen] = useState(false);
  const [isModsOpen, setModsOpen] = useState(false);
  const [isModActionLogOpen, setModActionLogOpen] = useState(false);
  const [isFilteredWordsOpen, setFilteredWordsOpen] = useState(false);

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

      await sendMessageCloud({
        conversationId: messagesRef.parent
          ? messagesRef.parent.id
          : messagesRef.id,
        text,
        isDeleted: false,
        font,
        fontSize,
        fontColor,
        backgroundImage: msgBgImg,
        bgColor: msgBgColor,
        nameColor,
        bgTransparency: msgBgTransparency,
        msgBgRepeat,
        msgBgPosition,
        msgBgImgTransparency,
      });

      setSentMsgCount(sentMsgCount + 1);
    }
  };

  const closeMenus = () => {
    setMenuOpenKey(menuOpenKey + 1);
  };

  query = messagesRef
    .limit(25)
    .orderBy("createdAt", "desc")
    .where("isDeleted", "==", false);

  const [messages] = useCollectionData(query, {
    idField: "id",
  });

  useEffect(async () => {
    if (isLoadingUser || !user) {
      return;
    }

    usersRef
      .doc(user.uid)
      .get()
      .then((doc) => {
        if (doc.exists) {
          const preferences = doc.data();
          if ("fontSize" in preferences) setFontSize(preferences.fontSize);
          if ("fontColor" in preferences) setFontColor(preferences.fontColor);
          if ("font" in preferences) setFont(preferences.font);
          if ("stylesEnabled" in preferences)
            setStylesEnabled(preferences.stylesEnabled);
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

    presence(user, setIsOnline);

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

    const idTokenResult = await firebase.auth().currentUser.getIdTokenResult();
    setPremium(idTokenResult.claims.stripeRole == "premium");
  }, [isLoadingUser]);

  useEffect(() => {
    if (!selection) return;
    const { start, end } = selection;
    messageInput.focus();
    messageInput.setSelectionRange(start, end);
  }, [selection]);

  useEffect(async () => {
    if (!props.dms) {
      return;
    }
    if (!user) {
      return;
    }

    await props.messagesRef.parent.set(
      {
        // NOTE: Required for marking messages read
        users: {
          [user.uid]: {
            lastReadAt: firebase.firestore.FieldValue.serverTimestamp(),
            // lastReadAt: new firebase.firestore.Timestamp(1726757369, 337000000),
          },
        },
      },
      { merge: true }
    );
  }, [messages]);

  return (
    <section className={styles["chat-section"]} onClickCapture={closeMenus}>
      <header>
        {props.header}{" "}
        {props.dms && (
          <CloseIcon
            className={styles["pointer"]}
            onClick={() => {
              props.setDmMessagesRef(null);
            }}
          />
        )}
      </header>
      <MessageList
        messages={messages}
        scrollToBottom={true}
        stylesEnabled={stylesEnabled}
        onMessageClick={(targetUsername) => {
          setMessageValue(messageValue + " @" + targetUsername + " ");
          messageInput.focus();
        }}
        sentMsgCount={sentMsgCount}
        currentUser={user}
        messagesRef={messagesRef}
      />

      <UserStyleControls
        open={isFormatOpen}
        premium={premium}
        menuOpenKey={menuOpenKey}
        setMenuOpenKey={setMenuOpenKey}
        stylesEnabled={stylesEnabled}
        setStylesEnabled={setStylesEnabled}
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
        stylesEnabled={stylesEnabled}
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

        <span
          className={styles["badge"] + " " + styles["pointer"]}
          data-badge-text={unreadCount ? unreadCount : ""}
          onClick={() => {
            setDmsOpen(!isDmsOpen);
          }}
        >
          <ChatBubbleIcon
            className={
              styles["pointer"] +
              " " +
              styles["chat-bubble-icon"] +
              " " +
              (unreadCount ? styles["yellow"] : "")
            }
          />
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
                    "Filtered words": () => {
                      setFilteredWordsOpen(!isFilteredWordsOpen);
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
            Premium: () => {
              setPremiumOpen(!isPremiumOpen);
            },
          }}
        />
      </div>

      <StyleEditorDialog
        open={isStyleEditorOpen}
        premium={premium}
        requestClose={() => {
          setStyleEditorOpen(false);
        }}
        messagesRef={messagesRef}
        user={user}
        fontSize={fontSize}
        fontColor={fontColor}
        font={font}
        msgBgImg={msgBgImg}
        nameColor={nameColor}
        msgBgColor={msgBgColor}
        msgBgTransparency={msgBgTransparency}
        msgBgRepeat={msgBgRepeat}
        msgBgPosition={msgBgPosition}
        msgBgImgTransparency={msgBgImgTransparency}
        stylesEnabled={stylesEnabled}
        setNameColor={setNameColor}
        setMsgBgColor={setMsgBgColor}
        setMsgBgTransparency={setMsgBgTransparency}
        setMsgBgImg={setMsgBgImg}
        setMsgBgRepeat={setMsgBgRepeat}
        setMsgBgPosition={setMsgBgPosition}
        setMsgBgImgTransparency={setMsgBgImgTransparency}
      />

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

      <PremiumDialog
        open={isPremiumOpen}
        uid={user.uid}
        premium={premium}
        stripeLink={user.stripeLink}
        requestClose={() => {
          setPremiumOpen(false);
        }}
      />

      <DmsDialog
        open={isDmsOpen}
        username={user.username}
        uid={user.uid}
        setDmMessagesRef={props.setDmMessagesRef}
        conversations={conversations}
        itemsPerPage={dmsPerPage}
        requestClose={() => {
          setDmsOpen(false);
        }}
      />

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

      <FilteredWordsDialog
        open={isFilteredWordsOpen}
        requestClose={() => {
          setFilteredWordsOpen(false);
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
            premium={premium}
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
                  if (e.target.files.length) {
                    const file = e.target.files[0];
                    const url = await uploadFile(file);
                    if (url) {
                      await auth.currentUser.updateProfile({ photoURL: url });
                      setPhotoURL(url);
                    }
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
