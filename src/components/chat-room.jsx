import {
  ChatBubble as ChatBubbleIcon,
  Close as CloseIcon,
  Gavel as GavelIcon,
  Menu as MenuIcon,
  VolumeOff as VolumeOffIcon,
  VolumeUp as VolumeUpIcon,
} from "@mui/icons-material";

import firebase from "firebase/compat/app";
import React, { useEffect, useRef, useState } from "react";
import { useCollectionData } from "react-firebase-hooks/firestore";
import { conversationsRef, usersRef } from "./chat-room-app";
import styles from "../css/chat-room.module.css";
import { fonts } from "../utils/fonts";
import { toggleSelectionMarkup } from "../utils/markdown";
import { startPresence } from "../utils/presence";
import { insertIntoInput, isGiftedPremium } from "../utils/utils";
import { translateError } from "../utils/errors";
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
import { FileUploadOverlay } from "./file-upload-overlay";

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

  const unreadCount =
    conversations && user
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

  const [presence, setPresence] = useState(null);
  const [isLoadingPresence, setLoadingPresence] = useState(false);
  const [errors, setErrors] = useState([]);
  const [messageErrorFlash, setMessageErrorFlash] = useState(0);
  const [premium, setPremium] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [messageValue, setMessageValue] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const unknownUserCount = onlineUsers.reduce((total, user) => {
    return total + (user.username ? 0 : 1);
  }, 0);

  // NOTE: Required for useEffect dependencies
  const userId = user ? user.uid : null;
  const username = user && user.username ? user.username : null;

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
  const [confirmModal, setConfirmModal] = useState(null);

  const [menuOpenKey, setMenuOpenKey] = useState(0);
  const [isEmojisOpen, setEmojisOpen] = useState(false);
  const [isFormatOpen, setFormatOpen] = useState(false);
  const [isStyleEditorOpen, setStyleEditorOpen] = useState(false);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [isPopMuted, setPopMuted] = useState(
    localStorage.getItem("isPopMuted") === "true"
  );

  const [sentMsgCount, setSentMsgCount] = useState(0);
  const [timestamps, setTimestamps] = useState([]);

  const [isDraggedOn, setIsDraggedOn] = useState(false);

  let messageInput = useRef();

  const sendMessage = async (e) => {
    e.preventDefault();

    // Spam limit (1 posts in 5 seconds) for anons
    if (
      user.email == null &&
      timestamps[0] &&
      Date.now() - timestamps[0] < 5000
    ) {
      return;
    }

    // Spam limit (3 posts in 3 seconds)
    if (timestamps[3] && Date.now() - timestamps[3] < 3000) {
      return;
    }

    const text = messageValue;

    try {
      if (conversationRef && !user.emailVerified) {
        throw new Error("Verify your email to do that.");
      }

      if (text) {
        setMessageValue("");

        setTimestamps((timestamps) => {
          return [Date.now(), ...timestamps];
        });

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
    } catch (error) {
      setMessageValue(text);
      setMessageErrorFlash(messageErrorFlash + 1);

      // NOTE: Reset the CSS animation by "triggering reflow"
      messageInput.current.style.animation = "none";
      messageInput.current.offsetHeight;
      messageInput.current.style.animation = null;

      setErrors([translateError(error).message]);
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
    if (isLoadingUser || isLoadingPresence) return true;

    // SAME USER
    if (
      presence &&
      (presence.uid == userId || (!userId && !presence.username))
    ) {
      return true;
    }

    setLoadingPresence(true);

    (async (presence, userId, user, username) => {
      if (presence) {
        // firebase
        //   .firestore()
        //   .doc(
        //     `debugLog/${presence.username}:${presence.uid}/log/${Date.now()}:${
        //       Math.random() * 99999999
        //     }`
        //   )
        //   .set(
        //     {
        //       clientTime: new Date(),
        //       serverTime: firebase.firestore.FieldValue.serverTimestamp(),
        //       action: `User changed. Unsubscribing and disconnecting...`,
        //     },
        //     { merge: true }
        //   );
        // NEW USER
        await presence.unsubscribe();
        await presence.disconnect();
      }

      if (user && username) {
        const doc = await usersRef.doc(userId).get();

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

        const idTokenResult = await user.auth.getIdTokenResult();
        setPremium(
          idTokenResult.claims.stripeRole === "premium" || isGiftedPremium(user)
        );
      }

      setPresence(startPresence(userId, username, setIsOnline));

      setLoadingPresence(false);
    })(presence, userId, user, username);
  }, [userId, isLoadingUser, isLoadingPresence]);

  useEffect(() => {
    if (!selection) return;
    const { start, end } = selection;
    messageInput.current.focus();
    messageInput.current.setSelectionRange(start, end);
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
    <section
      className={
        styles["chat-section"] +
        " " +
        (isDraggedOn ? styles["is-dragged-on"] : "")
      }
      onClickCapture={closeMenus}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggedOn(true);
      }}
    >
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
        stylesEnabled={stylesEnabled}
        onMessageClick={(targetUsername) => {
          setMessageValue(messageValue + " @" + targetUsername + " ");
          messageInput.current.focus();
        }}
        sentMsgCount={sentMsgCount}
        currentUser={user}
        isPopMuted={isPopMuted}
        setConfirmModal={setConfirmModal}
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
          messageInput={messageInput.current}
          setMessageValue={setMessageValue}
          setStyleEditorOpen={setStyleEditorOpen}
          isStyleEditorOpen={isStyleEditorOpen}
          fontColor={fontColor}
          setFontColor={setFontColor}
          toggleSelectionMarkup={(symbol) => {
            return toggleSelectionMarkup(messageInput.current, symbol);
          }}
          setSelection={setSelection}
          setPremiumPromptOpen={setPremiumPromptOpen}
        />
      )}

      <MessageInputForm
        premium={premium}
        sendMessage={sendMessage}
        ref={messageInput}
        messageValue={messageValue}
        setErrors={setErrors}
        messageErrorFlash={messageErrorFlash}
        setMessageValue={setMessageValue}
        setSelection={setSelection}
        toggleSelectionMarkup={(symbol) => {
          return toggleSelectionMarkup(messageInput.current, symbol);
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
        onlineUsers={onlineUsers}
        setLoginOpen={setLoginOpen}
      />

      <div className={styles["chat-controls"]}>
        {isPopMuted ? (
          <VolumeOffIcon
            className={styles["pointer"]}
            onClick={() => {
              localStorage.setItem("isPopMuted", false);
              setPopMuted(false);
            }}
          />
        ) : (
          <VolumeUpIcon
            className={styles["pointer"]}
            onClick={() => {
              localStorage.setItem("isPopMuted", true);
              setPopMuted(true);
            }}
          />
        )}

        <div>
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
                Banlist: () => {
                  setBanlistOpen(!isBanlistOpen);
                },
                ...(user.isAdmin
                  ? {
                      "Manage Moderators": () => {
                        setModsOpen(!isModsOpen);
                      },
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
                    "Edit profile": () => {
                      setProfileOpen(!isProfileOpen);
                    },
                    Premium: () => {
                      setPremiumOpen(!isPremiumOpen);
                    },
                    "Log out": async () => {
                      props.logout();
                    },
                  }
                : {
                    "Signup/Login": () => {
                      setLoginOpen(!isLoginOpen);
                    },
                  }),
            }}
          />
        </div>
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

      {user && user.isAdmin && (
        <ModeratorsDialog
          open={isModsOpen}
          requestClose={() => {
            setModsOpen(false);
          }}
        />
      )}

      <BanlistDialog
        open={isBanlistOpen}
        requestClose={() => {
          setBanlistOpen(false);
        }}
        setConfirmModal={setConfirmModal}
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
              messageInput.current.focus();
              insertIntoInput(emojiChar + " ", messageInput.current);
              setMessageValue(messageInput.current.value);
            }}
            setPremiumPromptOpen={setPremiumPromptOpen}
            setPremiumOpen={setPremiumOpen}
            messageValue={messageValue}
            setMessageValue={setMessageValue}
            messageInput={messageInput.current}
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
          user={user}
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

      {confirmModal && (
        <div className={styles["dialog"] + " " + styles["confirm-modal"]}>
          <main>{confirmModal.message}</main>
          <footer>
            {Object.entries(confirmModal)
              .filter(([key]) => key !== "message")
              .map(([key, value]) => (
                <button key={key} onClick={value}>
                  {key}
                </button>
              ))}
          </footer>
        </div>
      )}

      <ErrorDialog
        errors={errors}
        requestClose={() => {
          setErrors([]);
        }}
      />

      {!isOnline && (
        <div className={styles["chat-room-overlay"]}>
          <div className={styles["overlay-message"]}>
            <div>Connection interrupted.</div>
            <button
              onClickCapture={() => {
                if (presence.signalOnline) {
                  presence.signalOnline();
                }
              }}
            >
              Reconnect
            </button>
          </div>
        </div>
      )}

      <FileUploadOverlay
        isDraggedOn={isDraggedOn}
        setIsDraggedOn={setIsDraggedOn}
        messageInput={messageInput.current}
        messageValue={messageValue}
        setMessageValue={setMessageValue}
        setErrors={setErrors}
      />
    </section>
  );
}
