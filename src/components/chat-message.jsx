import { Block as BlockIcon, Person as PersonIcon } from "@mui/icons-material";
import { getFunctions, httpsCallable } from "firebase/functions";
import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown, { uriTransformer } from "react-markdown";
import rehypeRaw from "rehype-raw";
import gfm from "remark-gfm";
import klipyLogo from "../assets/klipy-logo.svg";
import styles from "../css/chat-room.module.css";
import "../css/oembed.css";
import useAudio from "../hooks/use-audio";
import popSound from "../sound/pop.wav";
import { hexToRgb } from "../utils/color";
import { CustomError } from "../utils/errors";
import { deleteMessage } from "../utils/messages";
import {
  flashInTitle,
  isImageUrl,
  stripHtml,
  timeout,
} from "../utils/utils";
import { banUser } from "./chat-room-app";

function Link({ href, isEmbedDisabled }) {
  const [embed, setEmbed] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setEmbed(null);

    (async () => {
      try {
        if (!isEmbedDisabled && isImageUrl(href)) {
          const validateImageEmbedUrl = httpsCallable(
            getFunctions(),
            "validateImageEmbedUrl"
          );
          // Validate before mounting the image so it cannot appear and then vanish.
          await validateImageEmbedUrl(href);
          if (!cancelled) {
            const url = new URL(href);
            setEmbed({
              href,
              providerName: "image",
              isImage: true,
              isKlipyGif:
                (url.hostname === "klipy.com" ||
                  url.hostname.endsWith(".klipy.com")) &&
                url.pathname.toLowerCase().endsWith(".gif"),
            });
          }
        } else {
          const getEmbed = httpsCallable(getFunctions(), "getEmbed");
          const result = await getEmbed({ url: href });

          if (!cancelled && result.data.html) {
            const template = document.createElement("template");
            template.innerHTML = result.data.html;
            template.content.querySelectorAll("a[href]").forEach((link) => {
              link.target = "_blank";
              link.relList.add("nofollow", "noreferrer", "noopener");
            });

            setEmbed({
              href,
              providerName: result.data.providerName,
              html: template.innerHTML,
            });
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Unable to embed link", {
            url: href,
            code: error.code,
            message: error.message,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [href, isEmbedDisabled]);

  const currentEmbed =
    embed?.href === href && (!embed.isImage || !isEmbedDisabled) ? embed : null;

  return (
    <span
      onMouseUp={(e) => {
        e.stopPropagation();
      }}
      data-provider={currentEmbed?.providerName || null}
    >
      {currentEmbed?.html ? (
        <span dangerouslySetInnerHTML={{ __html: currentEmbed.html }} />
      ) : (
        <a
          href={href}
          target="_blank"
          rel="nofollow noreferrer noopener"
          style={
            currentEmbed?.isImage
              ? {
                  padding: "0px",
                  display: "inline-flex",
                  verticalAlign: "bottom",
                  position: "relative",
                }
              : undefined
          }
        >
          {currentEmbed?.isImage ? (
            <>
              <img src={href} alt="embedded" />
              {currentEmbed.isKlipyGif && (
                <img
                  className={styles["klipy-logo"]}
                  src={klipyLogo}
                  alt="Klipy"
                  width={45}
                  height={12}
                />
              )}
            </>
          ) : href}
        </a>
      )}
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
    // NOTE: Derived by ChatRoom
    isHidden,
    isEmbedDisabled,
  } = props.message;

  const messageContents = useRef();

  const date = new Date();
  const createdAtDate = createdAt ? createdAt.toDate() : null;
  const [expanded, setExpanded] = useState(false);
  const [isPopPlaying, togglePop, restartPop] = useAudio(popSound);

  // Cap the font size for non-premium users
  fontSize = !premium && fontSize >= 15 ? 15 : fontSize;

  const { currentUser, setConfirmModal } = props;

  const messageClass =
    currentUser && uid === currentUser.uid ? "sent" : "received";

  const stylesEnabled =
    "stylesEnabled" in currentUser ? currentUser.stylesEnabled : true;
  // Stored default colors follow the theme; custom message palettes stay intact.
  const hasDefaultBackground =
    !premium ||
    (bgColor?.toLowerCase() === "#ffffff" &&
      Number(bgTransparency) === 1 &&
      !backgroundImage);

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

  return (
    <div
      data-chat-part="message"
      data-chat-direction={messageClass}
      data-chat-mention={doesMentionCurrentUser || undefined}
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
      style={{
        ...(stylesEnabled &&
          premium && {
            backgroundColor: hasDefaultBackground
              ? "var(--chat-message-background, #fff)"
              : `rgba(${hexToRgb(bgColor)},${bgTransparency})`,
          }),
        ...(isHidden && { display: "none" }),
      }}
    >
      <div
        data-chat-part="mention-highlight"
        className={styles["mention-highlight"]}
      ></div>
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
        <img
          data-chat-part="avatar"
          className={styles["avatar"]}
          src={photoUrl}
          alt="profile"
        />
      ) : (
        <PersonIcon data-chat-part="avatar" className={styles["avatar"]} />
      )}
      {isNewUser && currentUser && currentUser.isModerator && (
        <small className={styles["badge"]}>New</small>
      )}
      <div
        data-chat-part="message-body"
        className={`${styles["message-body"]} ${
          expanded ? styles["expanded"] : ""
        }`}
      >
        <span
          data-chat-part="message-details"
          className={styles["message-details"]}
        >
          <span data-chat-part="timestamp" className={styles["message-timestamp"]}>
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
                        This will also ban all accounts that have been accessed
                        by any IP addresses associated with {username}.
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
              onClick={() => deleteMessage(props.message)}
              // NOTE: Must stop propagation so clicking a link won't @ the poster
              onMouseUp={(e) => {
                e.stopPropagation();
              }}
            >
              X
            </button>
          )}
        </span>

        <span
          ref={messageContents}
          data-chat-part="contents"
          className={styles["message-contents"]}
          style={{
            ...(stylesEnabled
              ? {
                  fontSize: fontSize + "px",
                  color:
                    hasDefaultBackground &&
                    fontColor?.toLowerCase() === "#000000"
                      ? "var(--chat-ink, #000000)"
                      : fontColor,
                  fontFamily: font.style,
                }
              : {}),
            ...(expanded ? { maxHeight: "initial" } : { maxHeight: "300px" }),
          }}
        >
          <span
            className={styles["message-username"]}
            data-chat-part="username"
            style={
              stylesEnabled
                ? {
                    color:
                      hasDefaultBackground &&
                      nameColor?.toLowerCase() === "#000000"
                        ? "var(--chat-ink, #000000)"
                        : nameColor,
                  }
                : {}
            }
          >
            {username}:{" "}
          </span>
          {useMemo(() => {
            return (
              <ReactMarkdown
                components={{
                  // NOTE: Must overwrite the built-in renderer to ensure the text of the link is the URL
                  a: (props) => {
                    if (!props.href) {
                      return <>{props.children}</>;
                    }

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
                    return (
                      <Link
                        {...props}
                        isEmbedDisabled={isEmbedDisabled}
                      />
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
                  "blockquote",
                ]}
                transformLinkUri={(href, children, title) => {
                  try {
                    new URL(href);
                  } catch (error) {
                    return false;
                  }

                  const url = new URL(href);
                  url.protocol =
                    url.protocol === "http:" ? "https:" : url.protocol;
                  return uriTransformer(url.href);
                }}
                transformImageUri={(href, children, title) => {
                  try {
                    new URL(href);
                  } catch (error) {
                    return false;
                  }

                  const url = new URL(href);
                  url.protocol =
                    url.protocol === "http:" ? "https:" : url.protocol;
                  return uriTransformer(url.href);
                }}
              >
                {text}
              </ReactMarkdown>
            );
          }, [text, isEmbedDisabled, isNewUser])}
        </span>

        {messageContents.current &&
          messageContents.current.offsetHeight >= 300 &&
          (expanded == false ? (
            <div
              className={styles["show-more"] + " " + styles["link"]}
              data-chat-part="expand"
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
              data-chat-part="expand"
              onMouseUp={(e) => {
                e.stopPropagation();
                setExpanded(false);
              }}
            >
              Show less...
            </div>
          ))}
      </div>
    </div>
  );
}
