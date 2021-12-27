import ChatBubbleIcon from "@material-ui/icons/ChatBubble";
import CloseIcon from "@material-ui/icons/Close";
import GavelIcon from "@material-ui/icons/Gavel";
import MenuIcon from "@material-ui/icons/Menu";
import firebase from "firebase/compat/app";
import React, { useEffect, useRef, useState } from "react";
import { useCollectionData } from "react-firebase-hooks/firestore";
import { conversationsRef, usersRef } from "./chat-room-app";
import styles from "../css/chat-room.module.css";
import { fonts } from "../utils/fonts";
import { toggleSelectionMarkup } from "../utils/markdown";
import { presence } from "../utils/presence";
import { insertIntoInput } from "../utils/utils";
import { BanlistDialog } from "./banlist-dialog";
// import { getProviders } from "../oembed";
import { DmsDialog } from "./dms-dialog";
import { EmojiSelector } from "./emoji-selector";
import { ErrorDialog } from "./error-dialog";
import { FilteredWordsDialog } from "./filtered-words-dialog";
import { MenuWithButton } from "./menu-with-button";
import { MessageInputForm } from "./message-input-form";
import { MessageList } from "./message-list";
import { ModActionLogDialog } from "./mod-action-log-dialog";
import { ModeratorsDialog } from "./moderators-dialog";
import { PremiumDialog } from "./premium-dialog";
import { ProfileDialog } from "./profile-dialog";
import { StyleEditorDialog } from "./style-editor-dialog";
import { UserStyleControls } from "./user-style-controls";
import { LogInForm } from "./log-in-form";

export function ChatRoom(props) {
  const sendMessageCloud = firebase.functions().httpsCallable("sendMessage");
  const { messagesRef, conversationRef, user, isLoadingUser } = props;

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

  const [errors, setErrors] = useState([]);
  const [premium, setPremium] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [messageValue, setMessageValue] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const unknownUserCount = onlineUsers.reduce((total, user) => {
    return total + (user.username ? 0 : 1);
  }, 0);

  // NOTE: Required for useEffect dependencies
  const userId = user ? user.uid : null;
  const username = user ? user.username : null;

  const [photoUrl, setPhotoUrl] = useState(user ? user.photoUrl : null);
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

  const [isPremiumPromptOpen, setPremiumPromptOpen] = useState(false);
  const [isPremiumOpen, setPremiumOpen] = useState(false);
  const [isDmsOpen, setDmsOpen] = useState(false);
  const [isUsersOpen, setUsersOpen] = useState(false);
  const [isBanlistOpen, setBanlistOpen] = useState(false);
  const [isModsOpen, setModsOpen] = useState(false);
  const [isModActionLogOpen, setModActionLogOpen] = useState(false);
  const [isFilteredWordsOpen, setFilteredWordsOpen] = useState(false);
  const [isLoginOpen, setLoginOpen] = useState(false);

  const [menuOpenKey, setMenuOpenKey] = useState(0);
  const [isEmojisOpen, setEmojisOpen] = useState(false);
  const [isFormatOpen, setFormatOpen] = useState(false);
  const [isStyleEditorOpen, setStyleEditorOpen] = useState(false);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const [sentMsgCount, setSentMsgCount] = useState(0);

  let messageInput = useRef();

  const sendMessage = async (e) => {
    if (conversationRef && !user.emailVerified) {
      setErrors(["Verify your email to do that."]);
    }

    if (messageValue) {
      e.preventDefault();
      const text = messageValue;
      setMessageValue("");

      await sendMessageCloud({
        conversationId: conversationRef ? conversationRef.id : messagesRef.id,
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

  useEffect(() => {
    const unsubOnlineUsers = firebase
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

    return () => {
      unsubOnlineUsers();
    };
  }, []);

  useEffect(() => {
    const [unsubPresence, disconnectPresence] = presence(
      userId,
      username,
      setIsOnline
    );

    if (!user || !username) {
      return () => {
        unsubPresence();
        disconnectPresence();
      };
    }

    usersRef
      .doc(userId)
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

    async function fetchPremium() {
      const idTokenResult = await firebase
        .auth()
        .currentUser.getIdTokenResult();
      setPremium(idTokenResult.claims.stripeRole === "premium");
    }
    fetchPremium();

    return () => {
      unsubPresence();
      disconnectPresence();
    };

    // NOTE: isLoadingUser for loading new user, userId for cleanup when logging out
  }, [userId]);

  useEffect(() => {
    if (!selection) return;
    const { start, end } = selection;
    messageInput.focus();
    messageInput.setSelectionRange(start, end);
  }, [selection]);

  useEffect(() => {
    if (!props.dms) {
      return;
    }
    async function markMessagesRead() {
      await conversationRef.set(
        {
          // NOTE: Required for marking messages read
          users: {
            [userId]: {
              lastReadAt: firebase.firestore.FieldValue.serverTimestamp(),
              // lastReadAt: new firebase.firestore.Timestamp(1726757369, 337000000),
            },
          },
        },
        { merge: true }
      );
    }

    markMessagesRead();
  }, [props.dms, conversationRef, userId]);

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
        setErrors={setErrors}
        setAlerts={props.setAlerts}
        messagesRef={messagesRef}
        defaultMessages={messages}
        scrollToBottom={true}
        stylesEnabled={stylesEnabled}
        onMessageClick={(targetUsername) => {
          setMessageValue(messageValue + " @" + targetUsername + " ");
          messageInput.focus();
        }}
        sentMsgCount={sentMsgCount}
        currentUser={user}
      />

      {user && (
        <UserStyleControls
          uid={user.uid}
          open={isFormatOpen}
          premium={premium}
          isAnonymous={user.email == null}
          menuOpenKey={menuOpenKey}
          setMenuOpenKey={setMenuOpenKey}
          setErrors={setErrors}
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
          setPremiumPromptOpen={setPremiumPromptOpen}
        />
      )}

      <MessageInputForm
        premium={premium}
        sendMessage={sendMessage}
        setMessageInput={(input) => {
          messageInput = input;
        }}
        messageValue={messageValue}
        setErrors={setErrors}
        setMessageValue={setMessageValue}
        setSelection={setSelection}
        toggleSelectionMarkup={(symbol) => {
          return toggleSelectionMarkup(messageInput, symbol);
        }}
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
        userId={userId}
        setLoginOpen={setLoginOpen}
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

        {user && user.isModerator && (
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
            ...(user
              ? {
                  "Log out": async () => {
                    props.logout();
                  },
                }
              : {
                  "Signup/Login": () => {
                    setLoginOpen(!isLoginOpen);
                  },
                }),
            "Edit profile": () => {
              setProfileOpen(!isProfileOpen);
            },
            Premium: () => {
              setPremiumOpen(!isPremiumOpen);
            },
          }}
        />
      </div>

      {user && (
        <StyleEditorDialog
          open={isStyleEditorOpen}
          premium={premium}
          requestClose={() => {
            setStyleEditorOpen(false);
          }}
          setErrors={setErrors}
          setPremiumPromptOpen={setPremiumPromptOpen}
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
            {onlineUsers.map((user, i) => {
              return user.username && <li key={i}>{user.username}</li>;
            })}
          </ul>
          {unknownUserCount > 0 && `${unknownUserCount} unknown user(s)`}
        </div>
      )}

      {user && (
        <DmsDialog
          open={isDmsOpen}
          username={user.username}
          uid={user.uid}
          setConversationRef={props.setConversationRef}
          setDmMessagesRef={props.setDmMessagesRef}
          conversations={conversations}
          itemsPerPage={dmsPerPage}
          requestClose={() => {
            setDmsOpen(false);
          }}
        />
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
            isAnonymous={!user || user.email == null}
            setErrors={setErrors}
            onSelect={(emojiChar) => {
              messageInput.focus();
              insertIntoInput(emojiChar + " ", messageInput);
              setMessageValue(messageInput.value);
            }}
            setPremiumPromptOpen={setPremiumPromptOpen}
            setPremiumOpen={setPremiumOpen}
            messageValue={messageValue}
            setMessageValue={setMessageValue}
            messageInput={messageInput}
            shouldComponentUpdate={false}
            premium={premium}
          />
        </div>
      </div>

      {user && (
        <ProfileDialog
          open={isProfileOpen}
          requestClose={() => {
            setProfileOpen(false);
          }}
          setErrors={setErrors}
          setAlerts={props.setAlerts}
          photoUrl={photoUrl}
          setPhotoUrl={setPhotoUrl}
          isVerified={user.emailVerified}
        />
      )}

      {isPremiumPromptOpen && (
        <div className={styles["dialog"]}>
          <header>
            Premium Feature
            <CloseIcon
              onClick={() => {
                setPremiumPromptOpen(false);
              }}
            />
          </header>
          <main>
            You must be a Premium user to do that!
            <button
              className={styles["link"]}
              onClick={() => {
                setPremiumPromptOpen(false);
                setPremiumOpen(true);
              }}
            >
              Upgrade now!
            </button>
          </main>
        </div>
      )}

      {user && (
        <PremiumDialog
          open={isPremiumOpen}
          isAnonymous={user.email == null}
          uid={user.uid}
          premium={premium}
          requestClose={() => {
            setPremiumOpen(false);
          }}
        />
      )}

      <LogInForm
        open={!userId && !isLoadingUser && isLoginOpen}
        errors={errors}
        requestClose={() => {
          setLoginOpen(false);
        }}
        setAlerts={props.setAlerts}
        logout={props.logout}
      />

      <ErrorDialog
        errors={errors}
        requestClose={() => {
          setErrors([]);
        }}
      />

      {!isOnline && (
        <div className={styles["chat-room-overlay"]}>
          <div className={styles["overlay-message"]}>
            <div>Connection failed.</div>
            <div>Attemtping reconnect...</div>
          </div>
        </div>
      )}
    </section>
  );
}
