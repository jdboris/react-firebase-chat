import AddIcon from "@material-ui/icons/Add";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import CloseIcon from "@material-ui/icons/Close";
import FormatColorTextIcon from "@material-ui/icons/FormatColorText";
import React, { useState } from "react";
import { auth, userPreferencesRef } from "../app";
import styles from "../css/chat-room.module.css";
import { fonts } from "../fonts";
import { MARKUP_SYMBOLS } from "../markdown";
import { ColorInput } from "./color-input";

export function UserStyleControls(props) {
  const { uid } = auth.currentUser;

  const [enabled, setEnabled] = useState(props.enabled);
  const [isFontOpen, setFontOpen] = useState(false);

  return (
    <>
      {props.open && (
        <div className={styles["format-controls"]}>
          <span
            onClickCapture={() => {
              const newValue = !enabled;
              userPreferencesRef
                .doc(uid)
                .update({ enabled: newValue })
                .then(() => {
                  setEnabled(newValue);
                });
            }}
          >
            {enabled ? <CloseIcon /> : <AddIcon />}
          </span>
          {enabled && (
            <>
              <span
                onClickCapture={() => {
                  setFontOpen(!isFontOpen);
                }}
              >
                T<ArrowDropDownIcon className={styles["down-arrow"]} />
                {isFontOpen && (
                  <div className={styles["menu"]}>
                    {fonts.map((fontObj) => {
                      return (
                        <div
                          className={
                            props.font.name == fontObj.name
                              ? styles["bold"]
                              : ""
                          }
                          onClickCapture={() => {
                            userPreferencesRef
                              .doc(uid)
                              .update({ font: fontObj })
                              .then(() => {
                                props.setFont(fontObj);
                              });
                          }}
                        >
                          {fontObj.name}
                        </div>
                      );
                    })}
                  </div>
                )}
              </span>
              <span
                onClickCapture={() => {
                  props.setFontSizeOpen(!props.isFontSizeOpen);
                }}
              >
                {props.fontSize}
                <ArrowDropDownIcon className={styles["down-arrow"]} />
                {props.isFontSizeOpen && (
                  <div className={styles["menu"]}>
                    {[...Array(14).keys()].map((element) => {
                      return (
                        <div
                          onClickCapture={(e) => {
                            userPreferencesRef
                              .doc(uid)
                              .update({
                                fontSize: 9 + element,
                              })
                              .then(() => {
                                props.setFontSize(9 + element);
                              });
                          }}
                        >
                          {9 + element}
                        </div>
                      );
                    })}
                  </div>
                )}
              </span>
              <strong
                onClick={() => {
                  let result = props.toggleSelectionMarkup(MARKUP_SYMBOLS.BOLD);

                  props.setMessageValue(result.value);
                  props.setSelection({
                    start: result.start,
                    end: result.end,
                  });
                }}
              >
                B
              </strong>
              <em
                onClick={() => {
                  let result = props.toggleSelectionMarkup(
                    MARKUP_SYMBOLS.ITALICS
                  );

                  props.setMessageValue(result.value);
                  props.setSelection({
                    start: result.start,
                    end: result.end,
                  });
                }}
              >
                i
              </em>
              <span
                onClickCapture={() => {
                  props.setStyleEditorOpen(!props.isStyleEditorOpen);
                }}
              >
                bg
              </span>
              <span
                onClickCapture={() => {
                  props.setFontColorOpen(!props.isFontColorOpen);
                }}
              >
                {props.isFontColorOpen && (
                  <div
                    className={`${styles["menu"]} ${styles["font-color-picker"]}`}
                  >
                    <div>
                      <ColorInput
                        defaultValue={props.fontColor}
                        onChange={(e) => {
                          props.setFontColor(e.target.value);
                        }}
                        onChangeComplete={(e) => {
                          userPreferencesRef.doc(uid).update({
                            fontColor: e.target.value,
                          });
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        // NOTE: Required to prevent auto closing when clicking
                        onClickCapture={() => {
                          props.setFontColorOpen(true);
                        }}
                      />
                    </div>
                  </div>
                )}
                <FormatColorTextIcon
                  className={styles["font-color"]}
                  style={{ color: props.fontColor }}
                />
              </span>
            </>
          )}
        </div>
      )}
    </>
  );
}
