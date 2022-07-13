import { Block as BlockIcon, Person as PersonIcon } from "@mui/icons-material";
import firebase from "firebase/compat/app";
import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown, { uriTransformer } from "react-markdown";
import rehypeRaw from "rehype-raw";
import gfm from "remark-gfm";
import styles from "../css/chat-room.module.css";
import "../css/oembed.css";
import useAudio from "../hooks/use-audio";
import popSound from "../sound/pop.wav";
import { hexToRgb } from "../utils/color";
import { CustomError } from "../utils/errors";
import {
  flashInTitle,
  getImageSize,
  isImageUrl,
  stripHtml,
  timeout,
} from "../utils/utils";
import { banUser } from "./chat-room-app";

function Link(props) {
  const [children, setChildren] = useState(props.href);
  const [providerName, setProviderName] = useState("");

  useEffect(() => {
    (async (url) => {
      // 10 megabytes
      const sizeLimit = 10 * 1000 * 1000;

      if (
        isImageUrl(url) &&
        (await getImageSize(url).catch(() => 0)) <= sizeLimit
      ) {
        setProviderName("image");
        setChildren(
          <a
            href={url}
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
            <img src={url} alt="embedded" />
          </a>
        );

        const validateImageEmbedUrl = firebase
          .functions()
          .httpsCallable("validateImageEmbedUrl");
        try {
          await validateImageEmbedUrl(url);
        } catch (e) {
          setChildren(
            <a
              href={url}
              target="_blank"
              rel="nofollow noreferrer noopener"
              // NOTE: Must stop propagation so clicking a link won't @ the poster
              onMouseUp={(e) => {
                e.stopPropagation();
              }}
            >
              {/* NOTE: MUST keep the <img> tag in the DOM and clear the 
              src rather than deleting the tag, in order to stop the download. */}
              <img
                style={{ display: "none" }}
                src={""}
                alt="Embed failed."
                loading="lazy"
              />
              {url}
            </a>
          );
        }
      } else {
        setChildren(
          <a
            href={url}
            target="_blank"
            rel="nofollow noreferrer noopener"
            // NOTE: Must stop propagation so clicking a link won't @ the poster
            onMouseUp={(e) => {
              e.stopPropagation();
            }}
          >
            {url}
          </a>
        );

        const getEmbed = firebase.functions().httpsCallable("getEmbed");
        const result = await getEmbed({ url });

        if (result.data.html) {
          setProviderName(result.data.providerName);
          setChildren(
            <span dangerouslySetInnerHTML={{ __html: result.data.html }}></span>
          );
        }
      }
    })(props.href);
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
    isModMessage,
    premium,
    photoUrl,
    createdAt,
    username,
    isNewUser,
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

  const { currentUser, stylesEnabled, messagesRef, setConfirmModal } = props;

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
      {isNewUser && currentUser.isModerator && (
        <small className={styles["new-user-badge"]}>New</small>
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
                    if (
                      !props.href.trim().slice(0, -1).includes(".") ||
                      isNewUser
                    ) {
                      return <span>{props.href}</span>;
                    }
                    return <Link shouldComponentUpdate={false} {...props} />;
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
                transformLinkUri={(href, children, title) => {
                  const url = new URL(href);
                  url.protocol =
                    url.protocol === "http:" ? "https:" : url.protocol;
                  return uriTransformer(url.href);
                }}
                transformImageUri={(href, children, title) => {
                  const url = new URL(href);
                  url.protocol =
                    url.protocol === "http:" ? "https:" : url.protocol;
                  return uriTransformer(url.href);
                }}
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
              setConfirmModal({
                message: (
                  <>
                    Ban user {username}? <br />
                    <small>
                      This will also ban all accounts that have been accessed by
                      any IP addresses associated with {username}.
                    </small>
                  </>
                ),
                Ban: () => {
                  timeout(5000, async () => {
                    const result = await banUser(username);
                    props.setAlerts([result.data.message]);
                  }).catch((error) => {
                    props.setErrors([new CustomError(error.message, error)]);
                  });
                  setConfirmModal(null);
                },
                Cancel: () => {
                  setConfirmModal(null);
                },
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
