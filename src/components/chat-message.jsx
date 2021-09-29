import BlockIcon from "@material-ui/icons/Block";
import PersonIcon from "@material-ui/icons/Person";
import firebase from "firebase/app";
import isImageUrl from "is-image-url";
import React, { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import gfm from "remark-gfm";
import { auth, banUser } from "../app";
import { hexToRgb } from "../color";
import styles from "../css/chat-room.module.css";
import "../css/oembed.css";

function Link(props) {
  const [children, setChildren] = useState(props.href);
  const [providerName, setProviderName] = useState("");
  const [isInline, setInline] = useState(false);

  useEffect(() => {
    const getOembed = firebase.functions().httpsCallable("getOembed");

    getOembed({ url: props.href }).then((result) => {
      if (result.data.html) {
        setProviderName(result.data.providerName);
        setChildren(
          <span dangerouslySetInnerHTML={{ __html: result.data.html }}></span>
        );
      } else if (isImageUrl(props.href)) {
        setInline(true);
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
      data-provider={providerName}
      style={isInline ? { display: "inline" } : {}}
    >
      {children}
    </span>
  );
}

export function ChatMessage(props) {
  let {
    text,
    uid,
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

  // Cap the font size for non-premium users
  fontSize = premium && fontSize >= 15 ? 15 : fontSize;

  const { currentUser, stylesEnabled, messagesRef } = props;
  const messageClass = uid === auth.currentUser.uid ? "sent" : "received";

  let mouseDownSpot = null;

  const doesMentionCurrentUser = new RegExp(`@${username}\\b`, "g").test(text);

  text = text.replace(new RegExp(`@${username}\\b`, "g"), `**@${username}**`);

  function deleteMessage() {
    messagesRef.doc(props.message.id).update({ isDeleted: true });
  }

  return (
    <>
      <div
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
        <span className={styles["message-details"]}>
          <span className={styles["message-timestamp"]}>
            {createdAt && createdAt.toDate().toLocaleString()}
          </span>
          {currentUser.isModerator && (
            <button
              onClick={() => {
                banUser(username);
              }}
              // NOTE: Must stop propagation so clicking a link won't @ the poster
              onMouseUp={(e) => {
                e.stopPropagation();
              }}
            >
              <BlockIcon />
            </button>
          )}
          {currentUser.isModerator && (
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
        <div>
          <span
            className={styles["message-contents"]}
            style={
              stylesEnabled
                ? {
                    fontSize: fontSize + "pt",
                    color: fontColor,
                    fontFamily: font.style,
                  }
                : {}
            }
          >
            <span
              className={styles["message-username"]}
              style={stylesEnabled ? { color: nameColor } : {}}
            >
              {username}
            </span>
            :
            {useMemo(() => {
              return (
                <ReactMarkdown
                  components={{
                    // NOTE: Must overwrite the built-in renderer to ensure the text of the link is the URL
                    a: (props) => {
                      return (
                        <Link shouldComponentUpdate={false} href={props.href} />
                      );
                    },
                  }}
                  plugins={[gfm]}
                  allowedElements={["p", "em", "strong", "u", "a"]}
                >
                  {text}
                </ReactMarkdown>
              );
            }, [text])}
          </span>
        </div>
      </div>
    </>
  );
}
