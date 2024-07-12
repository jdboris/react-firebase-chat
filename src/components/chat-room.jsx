import {
  ChatBubble as ChatBubbleIcon,
  Close as CloseIcon,
  Gavel as GavelIcon,
  Menu as MenuIcon,
  VolumeOff as VolumeOffIcon,
  VolumeUp as VolumeUpIcon,
} from "@mui/icons-material";
import { getAuth, getIdTokenResult } from "firebase/auth";
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useCollectionData,
  useDocumentData,
} from "react-firebase-hooks/firestore";
import styles from "../css/chat-room.module.css";
import { CustomError } from "../utils/errors";
import { idConverter } from "../utils/firestore";
import { toggleSelectionMarkup } from "../utils/markdown";
import { sendMessage as sendMessageCloud } from "../utils/messages";
import { startPresence } from "../utils/presence";
import {
  getSelectionText,
  insertIntoInput,
  isGiftedPremium,
} from "../utils/utils";
import { BanlistDialog } from "./banlist-dialog";
import { firestore } from "./chat-room-app";
import { DmsDialog } from "./dms-dialog";
import { EmojiSelector } from "./emoji-selector";
import { ErrorDialog } from "./error-dialog";
import { FileUploadOverlay } from "./file-upload-overlay";
import { FilteredWordsDialog } from "./filtered-words-dialog";
import { LogInForm } from "./log-in-form";
import { MenuWithButton } from "./menu-with-button";
import { MessageInputForm } from "./message-input-form";
import { MessageList } from "./message-list";
import { ModActionLogDialog } from "./mod-action-log-dialog";
import { ModeratorsDialog } from "./moderators-dialog";
import { OnlineUsersDialog } from "./online-users-dialog";
import { PremiumDialog } from "./premium-dialog";
import { ProfileDialog } from "./profile-dialog";
import { StyleEditorDialog } from "./style-editor-dialog";
import { UserStyleControls } from "./user-style-controls";

const DELAY_MODE_USER_COUNT = 100;

export function ChatRoom(props) {
  const { messagesRef, conversationRef, user, isLoadingUser, headerLinks } =
    props;

  const [presence, setPresence] = useState(null);
  const [isLoadingPresence, setLoadingPresence] = useState(false);
  const [errors, setErrors] = useState([]);
  const [messageErrorFlash, setMessageErrorFlash] = useState(0);
  const [premium, setPremium] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [messageValue, setMessageValue] = useState("");
  const [onlineUsers, setOnlineUsers] = useState(null);

  // NOTE: Required for useEffect dependencies
  const userId = user ? user.uid : null;
  const username = user && user.username ? user.username : null;

  const [photoUrl, setPhotoUrl] = useState(user ? user.photoUrl : null);

  const [stylesEnabled, setStylesEnabled] = useState(true);

  const [isPremiumPromptOpen, setPremiumPromptOpen] = useState(false);
  const [isPremiumOpen, setPremiumOpen] = useState(false);
  const [unreadDmCount, setUnreadDmCount] = useState(0);
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

    const text = messageValue;

    let isNewUser = false;
    // ------------------------------------------------------------------------------------------------
    // RESTRICTIONS
    // ------------------------------------------------------------------------------------------------

    // {
    //   const timeSince = user.createdAt
    //     ? Date.now() - user.createdAt.toMillis()
    //     : 0;
    //   const threeMinutes = 3 * 60 * 1000;
    //   const thirtySeconds = 30 * 1000;
    //   const timeLeft = user.createdAt
    //     ? (user.email == null ? threeMinutes : thirtySeconds) - timeSince
    //     : 0;

    //   // Prevent posting for the first minute
    //   if (timeLeft > 0) {
    //     throw new CustomError(
    //       `Please wait a little longer (${Math.ceil(
    //         timeLeft / 1000
    //       )}s) before posting, or make an account.`,
    //       {
    //         duration: timeLeft,
    //       }
    //     );
    //   }
    // }

    // {
    //   const timeSince = timestamps[0] ? Date.now() - timestamps[0] : 0;
    //   const timeLeft = timestamps[0] ? 20000 - timeSince : 0;

    //   // Spam limit (1 posts in 20 seconds) for anons
    //   if (user.email == null && timeLeft > 0) {
    //     throw new CustomError(
    //       `Posting too often. Please wait (${Math.ceil(
    //         timeLeft / 1000
    //       )}s remaining), or make an account to raise your limit.`,
    //       {
    //         duration: timeLeft,
    //       }
    //     );
    //   }
    // }

    // {
    //   const timeSince = timestamps[3] ? Date.now() - timestamps[3] : 0;
    //   const timeLeft = timestamps[3] ? 3000 - timeSince : 0;

    //   // Spam limit (3 posts in 3 seconds)
    //   if (timeLeft > 0) {
    //     throw new CustomError(
    //       `Posting too often. Please wait (${Math.ceil(
    //         timeLeft / 1000
    //       )}s remaining)...`,
    //       {
    //         duration: timeLeft,
    //       }
    //     );
    //   }
    // }

    // // Restrict new users, to cut down on spam by throwaway accounts...
    // {
    //   const presence = onlineUsers.find(
    //     (onlineUser) => onlineUser.username === user.username
    //   );
    //   const timeSinceLogin =
    //     presence && presence.lastChanged
    //       ? Date.now() - presence.lastChanged.toMillis()
    //       : 0;

    //   const timeSinceCreated = user.createdAt
    //     ? Date.now() - user.createdAt.toMillis()
    //     : 0;

    //   const thirtyDays = 1000 * 60 * 60 * 24 * 30;
    //   const fiveMinutes = 1000 * 60 * 5;

    //   isNewUser = !user.messageCount || user.messageCount < 10;

    //   // If the user is new (<30 days) OR has been online for less than 5 minutes, AND has less than 10 messages sent
    //   if (
    //     (timeSinceCreated < thirtyDays || timeSinceLogin < fiveMinutes) &&
    //     isNewUser
    //   ) {
    //     const timeSinceLastPost = timestamps[0]
    //       ? Date.now() - timestamps[0]
    //       : 0;
    //     // Spam limit (1 posts in 20 seconds)
    //     const timeLeft = timestamps[0] ? 20000 - timeSinceLastPost : 0;

    //     if (timeLeft > 0) {
    //       throw new CustomError(
    //         `Account temporarily restricted. Please wait (${Math.ceil(
    //           timeLeft / 1000
    //         )}s) to post again...`,
    //         {
    //           duration: timeLeft,
    //         }
    //       );
    //     }

    //     if (text.length > 100) {
    //       throw new CustomError(
    //         `Account temporarily restricted. Post length limit (100 characters) exceeded.`
    //       );
    //     }
    //   }
    // }
    // ------------------------------------------------------------------------------------------------

    try {
      if (conversationRef && !user.emailVerified) {
        throw new CustomError("Verify your email to do that.");
      }

      if (text) {
        setMessageValue("");

        setTimestamps((timestamps) => {
          return [Date.now(), ...timestamps];
        });

        await sendMessageCloud(
          user,
          {
            conversationId: conversationRef
              ? conversationRef.id
              : messagesRef.id,
            text,
            isDeleted: false,
            isNewUser,
          },
          messages
        );

        setSentMsgCount(sentMsgCount + 1);
      }
    } catch (error) {
      setMessageValue(text);
      setMessageErrorFlash(messageErrorFlash + 1);

      // NOTE: Reset the CSS animation by "triggering reflow"
      messageInput.current.style.animation = "none";
      messageInput.current.offsetHeight;
      messageInput.current.style.animation = null;

      setErrors([new CustomError(error.message, error)]);
    }
  };

  const closeMenus = () => {
    setMenuOpenKey(menuOpenKey + 1);
  };

  const [delayedMessagesData, setDelayedMessagesData] = useState(null);
  const [realtimeMessagesData] = useDocumentData(
    delayedMessagesData ? null : doc(getFirestore(), "aggregateMessages/last25")
  );

  const [dmData] = useCollectionData(
    props.dms
      ? query(
          // NOTE: Must use messagesRef, since the parent specifies which collection to use
          messagesRef,
          limit(25),
          orderBy("createdAt", "desc"),
          where("isDeleted", "==", false)
        ).withConverter(idConverter)
      : null
  );

  const messages = useMemo(() => {
    if (!dmData && !delayedMessagesData && !realtimeMessagesData) {
      return [];
    }

    if (dmData) {
      return dmData;
    }

    const entries = Object.entries(
      delayedMessagesData?.list || realtimeMessagesData?.list || {}
    ).sort(
      (a, b) =>
        // NOTE: Default to current time in case there's no `createdAt` yet
        (a[1].createdAt || new Timestamp()) -
        (b[1].createdAt || new Timestamp())
    );

    return (
      entries
        // Add the "id" field for later.
        .map((pair) => ({ ...pair[1] }))
        .reverse()
    );
  }, [delayedMessagesData, realtimeMessagesData, dmData]);

  useEffect(() => {
    if (onlineUsers) {
      let timeout = null;

      // Below the delay mode user threshold
      if (onlineUsers.length < DELAY_MODE_USER_COUNT) {
        setDelayedMessagesData(null);
        return () => {};
      }

      const readMessages = async (delay, onlineUsers) => {
        const data = (
          await getDoc(doc(getFirestore(), "aggregateMessages/last25"))
        ).data() || { list: {} };
        const entries = Object.entries(data.list);

        setDelayedMessagesData({
          list: Object.fromEntries(
            entries.map((pair) => {
              // NOTE: Documents don't always have their timestamps yet by the time they're read
              if (pair[1].createdAt) {
                // How many milliseconds until the message should appear (after a delay of `delay`).
                const timeUntil =
                  pair[1].createdAt.toMillis() - (Date.now() - delay);

                if (timeUntil > 0) {
                  // Set a timer to show the message.
                  setTimeout(
                    () =>
                      setDelayedMessagesData((old) => ({
                        list: {
                          ...(old && old.list),
                          [pair[0]]: {
                            ...pair[1],
                            id: pair[0],
                            isHidden: false,
                            isEmbedDisabled: true,
                          },
                        },
                      })),
                    // Wait until `delay` milliseconds after the message would have appeared.
                    timeUntil
                  );
                }

                return [
                  pair[0],
                  {
                    ...pair[1],
                    id: pair[0],
                    isHidden: timeUntil > 0,
                    isEmbedDisabled: true,
                  },
                ];
              }

              return [
                pair[0],
                {
                  ...pair[1],
                  id: pair[0],
                  isHidden: true,
                  isEmbedDisabled: true,
                },
              ];
            })
          ),
        });

        // NOTE: Technically unneccesary but safeguards against costly bugs.
        if (onlineUsers.length >= DELAY_MODE_USER_COUNT) {
          // NOTE: Add 4000ms as a buffer in the lower user count range.
          // +1000ms delay per hundred users
          const delay = 4000 + onlineUsers.length * 10;
          timeout = setTimeout(() => readMessages(delay, onlineUsers), delay);
        }
      };

      readMessages(1, onlineUsers);

      return () => {
        if (timeout !== null) {
          clearTimeout(timeout);
        }
      };
    }
    // If there are online users AND there are enough to trigger delay mode.
  }, [onlineUsers !== null && onlineUsers.length >= DELAY_MODE_USER_COUNT]);

  useEffect(() => {
    const unsubOnlineUsers = onSnapshot(
      query(
        collection(firestore, "userPresences"),
        where("isOnline", "==", true)
      ),
      function (snapshot) {
        setOnlineUsers(
          snapshot.docs.map((doc) => {
            return doc.data();
          })
        );
      }
    );

    return () => {
      unsubOnlineUsers();
    };
  }, []);

  useEffect(() => {
    if (isLoadingUser || isLoadingPresence) return () => {};

    // SAME USER
    if (
      presence &&
      (presence.uid == userId || (!userId && !presence.username))
    ) {
      return () => {};
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
        const idTokenResult = await getIdTokenResult(getAuth().currentUser);
        setPremium(
          idTokenResult.claims.stripeRole === "premium" || isGiftedPremium(user)
        );
      }

      setPresence(startPresence(userId, username, setIsOnline));

      setLoadingPresence(false);
    })(presence, userId, user, username);
  }, [userId, isLoadingUser, isLoadingPresence]);

  useEffect(() => {
    if (!selection) return () => {};
    const { start, end } = selection;
    messageInput.current.focus();
    messageInput.current.setSelectionRange(start, end);
  }, [selection]);

  useEffect(() => {
    if (!props.dms) {
      return () => {};
    }
    async function markMessagesRead() {
      await setDoc(
        conversationRef,
        {
          // NOTE: Required for marking messages read
          users: {
            [userId]: {
              lastReadAt: serverTimestamp(),
              // lastReadAt: new firebase.firestore.Timestamp(1726757369, 337000000),
            },
          },
        },
        { merge: true }
      );
    }

    markMessagesRead();
  }, [props.dms, conversationRef, userId]);

  const mentionUser = useCallback(
    (targetUsername) => {
      const selection = getSelectionText();

      setMessageValue(
        messageValue +
          " @" +
          targetUsername +
          (selection.trim() ? " \n" + "> " + selection + "\n" : "") +
          " "
      );

      messageInput.current.focus();
    },
    [messageInput, messageValue]
  );

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
        <span>
          {props.header}
          {headerLinks}
        </span>
        {props.dms && (
          <CloseIcon
            className={styles["pointer"]}
            onClick={() => {
              props.setDmMessagesRef(null);
            }}
          />
        )}
      </header>

      {useMemo(
        () => (
          <MessageList
            setErrors={setErrors}
            setAlerts={props.setAlerts}
            messagesRef={messagesRef}
            defaultMessages={messages}
            onMessageClick={mentionUser}
            sentMsgCount={sentMsgCount}
            currentUser={user || {}}
            isPopMuted={isPopMuted}
            setConfirmModal={setConfirmModal}
          />
        ),
        [
          messages,
          messagesRef,
          messageInput,
          messageValue,
          sentMsgCount,
          user,
          isPopMuted,
        ]
      )}

      {user && (
        <UserStyleControls
          user={user}
          open={isFormatOpen}
          premium={premium}
          isAnonymous={user.email == null}
          menuOpenKey={menuOpenKey}
          setMenuOpenKey={setMenuOpenKey}
          setErrors={setErrors}
          messageInput={messageInput.current}
          setMessageValue={setMessageValue}
          setStyleEditorOpen={setStyleEditorOpen}
          isStyleEditorOpen={isStyleEditorOpen}
          toggleSelectionMarkup={(symbol) => {
            return toggleSelectionMarkup(messageInput.current, symbol);
          }}
          setSelection={setSelection}
          setPremiumPromptOpen={setPremiumPromptOpen}
        />
      )}

      <MessageInputForm
        user={user || {}}
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
        isEmojisOpen={isEmojisOpen}
        setEmojisOpen={setEmojisOpen}
        isFormatOpen={isFormatOpen}
        setFormatOpen={setFormatOpen}
        userId={userId}
        onlineUsers={onlineUsers}
        setLoginOpen={setLoginOpen}
      />

      <footer className={styles["chat-controls"]}>
        <div>
          <button
            className={styles["alt-button"]}
            onClick={() => {
              localStorage.setItem(
                "isPopMuted",
                !localStorage.getItem("isPopMuted")
              );
              setPopMuted(!isPopMuted);
            }}
          >
            {isPopMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
          </button>
        </div>

        <div>
          <button
            className={styles["alt-button"] + " " + styles["user-count"]}
            onClick={() => {
              setUsersOpen(!isUsersOpen);
            }}
          >
            {onlineUsers ? onlineUsers.length : 1}
          </button>

          <button
            className={styles["number-badge"] + " " + styles["alt-button"]}
            data-badge-text={unreadDmCount ? unreadDmCount : ""}
            onClick={() => {
              setDmsOpen(!isDmsOpen);
            }}
          >
            <ChatBubbleIcon
              className={
                styles["chat-bubble-icon"] +
                " " +
                (unreadDmCount ? styles["yellow"] : "")
              }
            />
          </button>

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
      </footer>

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
        />
      )}

      <OnlineUsersDialog
        open={isUsersOpen}
        requestClose={() => setUsersOpen(false)}
        onlineUsers={onlineUsers}
      />

      {user && (
        <DmsDialog
          open={isDmsOpen}
          username={user.username}
          userId={user.uid}
          setConversationRef={props.setConversationRef}
          setDmMessagesRef={props.setDmMessagesRef}
          onChange={(conversations) => {
            setUnreadDmCount(
              conversations && user
                ? conversations.reduce((total, conversation) => {
                    const lastReadAt = conversation.users[user.uid].lastReadAt;
                    let isUnread = false;

                    // NOTE: lastReadAt will be null from latency compensation
                    if (lastReadAt !== null) {
                      isUnread = conversation.lastMessageSentAt > lastReadAt;
                    }
                    return isUnread ? total + 1 : total;
                  }, 0)
                : 0
            );
          }}
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
        setAlerts={props.setAlerts}
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
          isAnonymous={user.email == null}
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
              .map(([key, value], i) => (
                <button key={`confirm-modal-button-${i}`} onClick={value}>
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
