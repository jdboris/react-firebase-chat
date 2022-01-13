import { Add as AddIcon } from "@mui/icons-material";
import { ArrowDropDown as ArrowDropDownIcon } from "@mui/icons-material";
import { Close as CloseIcon } from "@mui/icons-material";
import { FormatColorText as FormatColorTextIcon } from "@mui/icons-material";
import React from "react";
import { usersRef } from "./chat-room-app";
import styles from "../css/chat-room.module.css";
import { fonts } from "../utils/fonts";
import { MARKUP_SYMBOLS } from "../utils/markdown";
import { ColorInput } from "./color-input";
import { MenuWithButton } from "./menu-with-button";

export function UserStyleControls(props) {
  const {
    uid,
    isAnonymous,
    setErrors,
    stylesEnabled,
    setStylesEnabled,
    open,
    premium,
    setPremiumPromptOpen,
    menuOpenKey,
    font,
    setFont,
    fontSize,
    setFontSize,
    fontColor,
    setFontColor,
    toggleSelectionMarkup,
    setMessageValue,
    setSelection,
    isStyleEditorOpen,
    setStyleEditorOpen,
  } = props;

  const enabled = stylesEnabled;

  return (
    <>
      {open && (
        <div className={styles["format-controls"]}>
          <span
            onClickCapture={() => {
              if (isAnonymous)
                return setErrors(["Create an account to do that."]);
              const newValue = !enabled;
              usersRef
                .doc(uid)
                .update({ stylesEnabled: newValue })
                .then(() => {
                  setStylesEnabled(newValue);
                });
            }}
          >
            {enabled ? <CloseIcon /> : <AddIcon />}
          </span>
          {enabled && (
            <>
              <MenuWithButton
                button={
                  <>
                    T
                    <ArrowDropDownIcon className={styles["down-arrow"]} />
                  </>
                }
                openKey={menuOpenKey}
                items={fonts.reduce((items, fontObj) => {
                  items[
                    fontObj.name + (font.name === fontObj.name ? " ✓" : "")
                  ] = () => {
                    if (isAnonymous)
                      return setErrors(["Create an account to do that."]);
                    usersRef
                      .doc(uid)
                      .update({ font: fontObj })
                      .then(() => {
                        setFont(fontObj);
                      });
                  };

                  return items;
                }, {})}
              />

              <MenuWithButton
                button={
                  <>
                    {fontSize}
                    <ArrowDropDownIcon className={styles["down-arrow"]} />
                  </>
                }
                openKey={menuOpenKey}
                // Convert to an object with reduce
                items={[...Array(6).keys()].reduce((items, number) => {
                  items[9 + number] = () => {
                    if (isAnonymous)
                      return setErrors(["Create an account to do that."]);
                    usersRef
                      .doc(uid)
                      .update({
                        fontSize: 9 + number,
                      })
                      .then(() => {
                        setFontSize(9 + number);
                      });
                  };

                  return items;
                }, {})}
              >
                {[...Array(8).keys()].map((number, i) => {
                  return (
                    <div
                      key={"premium-" + i}
                      className={!premium ? styles["disabled"] : ""}
                      onClickCapture={() => {
                        if (isAnonymous)
                          return setErrors(["Create an account to do that."]);
                        if (!premium) return setPremiumPromptOpen(true);

                        usersRef
                          .doc(uid)
                          .update({
                            fontSize: 15 + number,
                          })
                          .then(() => {
                            setFontSize(15 + number);
                          });
                      }}
                    >
                      {15 + number}
                    </div>
                  );
                })}
              </MenuWithButton>

              <strong
                onClick={() => {
                  const result = toggleSelectionMarkup(MARKUP_SYMBOLS.BOLD);

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
                  const result = toggleSelectionMarkup(MARKUP_SYMBOLS.ITALICS);

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
                  if (isAnonymous)
                    return setErrors(["Create an account to do that."]);
                  setStyleEditorOpen(!isStyleEditorOpen);
                }}
              >
                bg
              </span>

              <MenuWithButton
                button={
                  <FormatColorTextIcon
                    className={styles["font-color"]}
                    style={{ color: fontColor }}
                  />
                }
                openKey={menuOpenKey}
                keepOpen={true}
              >
                <ColorInput
                  defaultValue={fontColor}
                  onChange={(e) => {
                    if (isAnonymous)
                      return setErrors(["Create an account to do that."]);
                    setFontColor(e.target.value);
                  }}
                  onChangeComplete={(e) => {
                    if (isAnonymous)
                      return setErrors(["Create an account to do that."]);
                    usersRef.doc(uid).update({
                      fontColor: e.target.value,
                    });
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isAnonymous)
                      return setErrors(["Create an account to do that."]);
                  }}
                />
              </MenuWithButton>
            </>
          )}
        </div>
      )}
    </>
  );
}
