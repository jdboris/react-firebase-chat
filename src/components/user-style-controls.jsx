import {
  Add as AddIcon,
  ArrowDropDown as ArrowDropDownIcon,
  Close as CloseIcon,
  FormatColorText as FormatColorTextIcon,
} from "@mui/icons-material";
import React from "react";
import styles from "../css/chat-room.module.css";
import { CustomError } from "../utils/errors";
import { fonts } from "../utils/fonts";
import { MARKUP_SYMBOLS } from "../utils/markdown";
import { usersRef } from "./chat-room-app";
import { ColorInput } from "./color-input";
import { MenuWithButton } from "./menu-with-button";
import { doc, updateDoc } from "firebase/firestore";

export function UserStyleControls({
  user: { uid, font, fontSize, fontColor, stylesEnabled },
  isAnonymous,
  setErrors,
  open,
  premium,
  setPremiumPromptOpen,
  menuOpenKey,
  toggleSelectionMarkup,
  setMessageValue,
  setSelection,
  isStyleEditorOpen,
  setStyleEditorOpen,
}) {
  const enabled = stylesEnabled;

  return (
    <>
      {open && (
        <div className={styles["format-controls"]}>
          <span
            onClickCapture={() => {
              if (isAnonymous)
                return setErrors([
                  new CustomError("Create an account to do that."),
                ]);
              const newValue = !enabled;

              updateDoc(doc(usersRef, uid), { stylesEnabled: newValue });
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
                      return setErrors([
                        new CustomError("Create an account to do that."),
                      ]);
                    updateDoc(doc(usersRef, uid), { font: fontObj });
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
                      return setErrors([
                        new CustomError("Create an account to do that."),
                      ]);
                    updateDoc(doc(usersRef, uid), {
                      fontSize: 9 + number,
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
                          return setErrors([
                            new CustomError("Create an account to do that."),
                          ]);
                        if (!premium) return setPremiumPromptOpen(true);

                        updateDoc(doc(usersRef, uid), {
                          fontSize: 15 + number,
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
                    return setErrors([
                      new CustomError("Create an account to do that."),
                    ]);
                  setStyleEditorOpen(!isStyleEditorOpen);
                }}
              >
                bg
              </span>

              <MenuWithButton
                button={
                  <FormatColorTextIcon
                    className={styles["font-color"]}
                    style={{
                      border: `1px solid ${fontColor}`,
                    }}
                  />
                }
                openKey={menuOpenKey}
                keepOpen={true}
              >
                <ColorInput
                  defaultValue={fontColor}
                  onChange={(e) => {
                    if (isAnonymous)
                      return setErrors([
                        new CustomError("Create an account to do that."),
                      ]);
                    updateDoc(doc(usersRef, uid), {
                      fontColor: e.target.value,
                    });
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isAnonymous)
                      return setErrors([
                        new CustomError("Create an account to do that."),
                      ]);
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
