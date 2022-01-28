import { Person as PersonIcon } from "@mui/icons-material";
import { Block as BlockIcon } from "@mui/icons-material";
import firebase from "firebase/compat/app";
import React, { useEffect, useMemo, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import gfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { banUser } from "./chat-room-app";
import { hexToRgb } from "../utils/color";
import styles from "../css/chat-room.module.css";
import "../css/oembed.css";
import { translateError } from "../utils/errors";
import { timeout, isImageUrl, stripHtml, flashInTitle } from "../utils/utils";
import useAudio from "../hooks/use-audio";
import popSound from "../sound/pop.wav";

function Link(props) {
  const [children, setChildren] = useState(props.href);
  const [providerName, setProviderName] = useState("");

  useEffect(() => {
    const getOembed = firebase.functions().httpsCallable("getOembed");

    getOembed({ url: props.href }).then((result) => {
      if (result.data.html) {
        setProviderName(result.data.providerName);
        setChildren(
          <span dangerouslySetInnerHTML={{ __html: result.data.html }}></span>
        );
      } else if (isImageUrl(props.href)) {
        setProviderName("image");
        setChildren(
          <a
            href={props.href}
            target="_blank"
            rel="nofollow noreferrer noopener"
            // NOTE: Must stop propagation so clicking a link won't @ the poster
            onMouseUp={(e) => {
              e.stopPropagation();
            }}
            style={{
              padding: "0px",
              display: "inline-flex",
              verticalAlign: "bottom",
            }}
          >
            <img src={props.href} alt="embedded" />
          </a>
        );
      } else {
        setChildren(
          <a
            href={props.href}
            target="_blank"
            rel="nofollow noreferrer noopener"
            // NOTE: Must stop propagation so clicking a link won't @ the poster
            onMouseUp={(e) => {
              e.stopPropagation();
            }}
          >
            {props.href}
          </a>
        );
      }
    });
  }, [props.href]);

  return (
    <span
      onMouseUp={(e) => {
        e.stopPropagation();
      }}
      data-provider={providerName ? providerName : null}
    >
      {children}
    </span>
  );
}

export function ChatMessage(props) {
  let {
    text,
    uid,
    key,
    isModMessage,
    premium,
    photoUrl,
    createdAt,
    username,
    fontSize,
    fontColor,
    font,
    backgroundImage,
    nameColor,
    bgColor,
    bgTransparency,
    msgBgRepeat,
    msgBgPosition,
    msgBgImgTransparency,
  } = props.message;

  const messageContents = useRef();

  const date = new Date();
  const createdAtDate = createdAt ? createdAt.toDate() : null;
  const [expanded, setExpanded] = useState(false);
  const [isPopPlaying, togglePop, restartPop] = useAudio(popSound);

  // Cap the font size for non-premium users
  fontSize = !premium && fontSize >= 15 ? 15 : fontSize;

  const { currentUser, stylesEnabled, messagesRef } = props;
  const messageClass =
    currentUser && uid === currentUser.uid ? "sent" : "received";

  let mouseDownSpot = null;

  const doesMentionCurrentUser = currentUser
    ? new RegExp(`@${currentUser.username}\\b`, "g").test(text) ||
      (isModMessage && new RegExp(`@everyone\\b`, "g").test(text))
    : false;

  if (doesMentionCurrentUser) {
    text = text.replace(
      new RegExp(`@${currentUser.username}\\b`, "g"),
      `<span class="${styles.mention}">@${currentUser.username}</span>`
    );
  }

  if (isModMessage) {
    text = text.replace(
      new RegExp(`@everyone\\b`, "g"),
      `<span class="${styles.mention}">@everyone</span>`
    );
  }

  useEffect(() => {
    if (doesMentionCurrentUser) {
      if (!isPopPlaying && !props.isPopMuted) {
        togglePop();
        flashInTitle(`${username}: ${stripHtml(text)}`);
      }
    }
  }, []);

  function deleteMessage() {
    messagesRef.doc(props.message.id).update({ isDeleted: true });
  }

  return (
    <div
      key={key}
      className={
        styles["message"] +
        " " +
        styles[messageClass] +
        " " +
        (doesMentionCurrentUser ? styles["mention"] : "")
      }
      onMouseDown={(e) => {
        mouseDownSpot = { x: e.pageX, y: e.pageY };
      }}
      onMouseUp={(e) => {
        // Left click
        if (e.button === 0 && mouseDownSpot) {
          let a = mouseDownSpot.x - e.pageX;
          let b = mouseDownSpot.y - e.pageY;

          let distance = Math.sqrt(a * a + b * b);

          if (distance <= 2) {
            props.onClick(username);
            mouseDownSpot = null;
          }
        }
      }}
      style={
        stylesEnabled && premium
          ? {
              backgroundColor: `rgba(${hexToRgb(bgColor)},${bgTransparency})`,
            }
          : {}
      }
    >
      <div className={styles["mention-highlight"]}></div>
      <div
        className={styles["message-background-image"]}
        style={
          stylesEnabled && premium
            ? {
                backgroundImage: `url(${backgroundImage})`,
                backgroundRepeat: msgBgRepeat,
                backgroundPosition: msgBgPosition,
                opacity: msgBgImgTransparency,
              }
            : {}
        }
      ></div>
      {photoUrl ? (
        <img className={styles["avatar"]} src={photoUrl} alt="profile" />
      ) : (
        <PersonIcon className={styles["avatar"]} />
      )}
      <div className={expanded ? styles["expanded"] : ""}>
        <span
          ref={messageContents}
          className={styles["message-contents"]}
          style={{
            ...(stylesEnabled
              ? {
                  fontSize: fontSize + "px",
                  color: fontColor,
                  fontFamily: font.style,
                }
              : {}),
            ...(expanded ? { maxHeight: "initial" } : { maxHeight: "300px" }),
          }}
        >
          <span
            className={styles["message-username"]}
            style={stylesEnabled ? { color: nameColor } : {}}
          >
            {username}:{" "}
          </span>
          {useMemo(() => {
            return (
              <ReactMarkdown
                components={{
                  // NOTE: Must overwrite the built-in renderer to ensure the text of the link is the URL
                  a: (props) => {
                    if (
                      props.href.trim() == "http://www" ||
                      props.href.trim() == "https://www"
                    ) {
                      return <span>www</span>;
                    }

                    // NOTE: If the URL has no '.' (excluding the last character)
                    if (!props.href.trim().slice(0, -1).includes(".")) {
                      return <span>{props.href}</span>;
                    }
                    return (
                      <Link shouldComponentUpdate={false} href={props.href} />
                    );
                  },
                  // NOTE: Must overwrite the built-in renderer to ensure the text of the link is the URL
                  span: ({ className, children }) => {
                    // Only allow whitelisted classes
                    if (className != styles.mention) {
                      return <span>{children}</span>;
                    }
                    return <span className={className}>{children}</span>;
                  },
                }}
                plugins={[gfm]}
                rehypePlugins={[rehypeRaw]}
                allowedElements={[
                  "p",
                  "em",
                  "strong",
                  "u",
                  "a",
                  "span",
                  "code",
                  "pre",
                  "ol",
                  "ul",
                  "li",
                  "del",
                ]}
              >
                {text}
              </ReactMarkdown>
            );
          }, [text])}
        </span>

        {messageContents.current &&
          messageContents.current.offsetHeight >= 300 &&
          (expanded == false ? (
            <div
              className={styles["show-more"] + " " + styles["link"]}
              onMouseUp={(e) => {
                e.stopPropagation();
                setExpanded(true);
              }}
            >
              Show more...
            </div>
          ) : (
            <div
              className={styles["show-less"] + " " + styles["link"]}
              onMouseUp={(e) => {
                e.stopPropagation();
                setExpanded(false);
              }}
            >
              Show less...
            </div>
          ))}
      </div>
      <span className={styles["message-details"]}>
        <span className={styles["message-timestamp"]}>
          {createdAt &&
            createdAtDate.toLocaleString(
              "en-US",
              !(
                createdAtDate.getMonth() == date.getMonth() &&
                createdAtDate.getDate() == date.getDate() &&
                createdAtDate.getYear() == date.getYear()
              )
                ? {
                    dateStyle: "medium",
                    timeStyle: "short",
                    hour12: true,
                  }
                : {
                    timeStyle: "short",
                    hour12: true,
                  }
            )}
        </span>
        {currentUser && currentUser.isModerator && (
          <button
            onClick={() => {
              timeout(5000, async () => {
                const result = await banUser(username);
                props.setAlerts([result.data.message]);
              }).catch((error) => {
                props.setErrors([translateError(error).message]);
              });
            }}
            // NOTE: Must stop propagation so clicking a link won't @ the poster
            onMouseUp={(e) => {
              e.stopPropagation();
            }}
          >
            <BlockIcon />
          </button>
        )}
        {currentUser && currentUser.isModerator && (
          <button
            onClick={deleteMessage}
            // NOTE: Must stop propagation so clicking a link won't @ the poster
            onMouseUp={(e) => {
              e.stopPropagation();
            }}
          >
            X
          </button>
        )}
      </span>
    </div>
  );
}
