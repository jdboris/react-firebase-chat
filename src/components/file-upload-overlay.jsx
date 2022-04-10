import React, { useState } from "react";
import styles from "../css/chat-room.module.css";
import { CustomError } from "../utils/errors";
import { uploadFile } from "../utils/storage";
import { timeout } from "../utils/utils";

export function FileUploadOverlay(props) {
  const [loading, setLoading] = useState(false);

  return (
    (props.isDraggedOn || loading) && (
      <label
        className={
          styles["file-drag-overlay"] + " " + (loading ? styles["loading"] : "")
        }
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();

          props.setIsDraggedOn(false);

          if (loading) return;
          setLoading(true);
          timeout(20000, async () => {
            const files = e.dataTransfer.files;
            if (!files.length) {
              return;
            }

            const file = files[0];
            const url = await uploadFile(file);

            if (!url) {
              throw new CustomError("Error uploading file.");
            }

            props.messageInput.focus();
            props.setMessageValue(props.messageValue + " " + url + " ");
          })
            .catch((error) => {
              props.setErrors([new CustomError(error.message, error)]);
            })
            .finally(() => {
              setLoading(false);
              e.target.value = "";
            });
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          props.setIsDraggedOn(false);
        }}
        onDragEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          props.setIsDraggedOn(false);
        }}
        onClickCapture={(e) => {
          e.preventDefault();
          e.stopPropagation();
          props.setIsDraggedOn(false);
        }}
      >
        <div>
          <input
            type="file"
            onBlur={(e) => {
              if (!e.target.files.length) {
                props.setIsDraggedOn(false);
              }
            }}
            onFocus={(e) => {
              if (!e.target.files.length) {
                props.setIsDraggedOn(false);
              }
            }}
          />
        </div>
      </label>
    )
  );
}
