import React, { useState, useEffect, useMemo } from "react";
import isImageUrl from "is-image-url";
import PersonIcon from "@material-ui/icons/Person";
import BlockIcon from "@material-ui/icons/Block";
import ReactMarkdown from "react-markdown";
import gfm from "remark-gfm";
import styles from "../css/chat-room.module.css";
import "../css/oembed.css";
import firebase from "firebase/app";

import { auth, messagesRef, bannedUsersRef } from "../app";
import { hexToRgb } from "../color";

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
            <img src={props.href} />
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
  }, []);

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
    photoURL,
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
  const { userStyles } = props;
  const { claims } = props.idToken;
  const messageClass = uid === auth.currentUser.uid ? "sent" : "received";

  let mouseDownSpot = null;

  const doesMentionCurrentUser = new RegExp(
    `@${auth.currentUser.displayName}\\b`,
    "g"
  ).test(text);

  text = text.replace(
    new RegExp(`@${auth.currentUser.displayName}\\b`, "g"),
    `**@${auth.currentUser.displayName}**`
  );

  function banUser() {
    bannedUsersRef.doc(props.message.uid).set({});
  }

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
          if (e.button == 0 && mouseDownSpot) {
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
          userStyles
            ? {
                backgroundColor: `rgba(${hexToRgb(bgColor)},${bgTransparency})`,
              }
            : {}
        }
      >
        <div
          className={styles["message-background-image"]}
          style={
            userStyles
              ? {
                  backgroundImage: `url(${backgroundImage})`,
                  backgroundRepeat: msgBgRepeat,
                  backgroundPosition: msgBgPosition,
                  opacity: msgBgImgTransparency,
                }
              : {}
          }
        ></div>
        {photoURL ? (
          <img className={styles["avatar"]} src={photoURL} />
        ) : (
          <PersonIcon className={styles["avatar"]} />
        )}
        <span className={styles["message-details"]}>
          <span className={styles["message-timestamp"]}>
            {createdAt && createdAt.toDate().toLocaleString()}
          </span>
          {claims.isModerator && (
            <button onClick={banUser}>
              <BlockIcon />
            </button>
          )}
          {claims.isModerator && <button onClick={deleteMessage}>X</button>}
        </span>
        <div>
          <span
            className={styles["message-username"]}
            style={{ color: nameColor }}
          >
            {username}
          </span>
          :
          <span
            className={styles["message-contents"]}
            style={
              userStyles
                ? {
                    fontSize: fontSize + "px",
                    color: fontColor,
                    fontFamily: font.style,
                  }
                : {}
            }
          >
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
