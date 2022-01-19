import React, { useState } from "react";
import styles from "../css/chat-room.module.css";
import { translateError } from "../utils/errors";
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
              throw new Error("Error uploading file.");
            }

            props.messageInput.focus();
            props.setMessageValue(props.messageValue + " " + url + " ");
          })
            .catch((error) => {
              props.setErrors([translateError(error).message]);
            })
            .finally(() => {
              setLoading(false);
              e.target.value = "";
            });

          props.setIsDraggedOn(false);
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
      >
        <div>
          <input type="file" />
        </div>
      </label>
    )
  );
}
