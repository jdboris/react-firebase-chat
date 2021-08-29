import AddIcon from "@material-ui/icons/Add";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import CloseIcon from "@material-ui/icons/Close";
import FormatColorTextIcon from "@material-ui/icons/FormatColorText";
import React, { useState } from "react";
import { auth, usersRef } from "../app";
import styles from "../css/chat-room.module.css";
import { fonts } from "../fonts";
import { MARKUP_SYMBOLS } from "../markdown";
import { ColorInput } from "./color-input";
import { MenuWithButton } from "./menu-with-button";

export function UserStyleControls(props) {
  const { uid } = auth.currentUser;

  const enabled = props.stylesEnabled;

  return (
    <>
      {props.open && (
        <div className={styles["format-controls"]}>
          <span
            onClickCapture={() => {
              const newValue = !enabled;
              usersRef
                .doc(uid)
                .update({ stylesEnabled: newValue })
                .then(() => {
                  props.setStylesEnabled(newValue);
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
                openKey={props.menuOpenKey}
                items={fonts.reduce((items, fontObj) => {
                  items[
                    fontObj.name + (props.font.name == fontObj.name ? " ✓" : "")
                  ] = () => {
                    usersRef
                      .doc(uid)
                      .update({ font: fontObj })
                      .then(() => {
                        props.setFont(fontObj);
                      });
                  };

                  return items;
                }, {})}
              />

              <MenuWithButton
                button={
                  <>
                    {props.fontSize}
                    <ArrowDropDownIcon className={styles["down-arrow"]} />
                  </>
                }
                openKey={props.menuOpenKey}
                items={[...Array(14).keys()].reduce((items, number) => {
                  items[9 + number] = () => {
                    usersRef
                      .doc(uid)
                      .update({
                        fontSize: 9 + number,
                      })
                      .then(() => {
                        props.setFontSize(9 + number);
                      });
                  };

                  return items;
                }, {})}
              />

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

              <MenuWithButton
                button={
                  <FormatColorTextIcon
                    className={styles["font-color"]}
                    style={{ color: props.fontColor }}
                  />
                }
                openKey={props.menuOpenKey}
                keepOpen={true}
              >
                <ColorInput
                  defaultValue={props.fontColor}
                  onChange={(e) => {
                    props.setFontColor(e.target.value);
                  }}
                  onChangeComplete={(e) => {
                    usersRef.doc(uid).update({
                      fontColor: e.target.value,
                    });
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
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
