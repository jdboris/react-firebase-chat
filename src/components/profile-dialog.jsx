import {
  Close as CloseIcon,
  Create as PencilIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import { updateProfile } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { default as React, useState } from "react";
import styles from "../css/chat-room.module.css";
import { CustomError } from "../utils/errors";
import { uploadFile } from "../utils/storage";
import { timeout } from "../utils/utils";
import { auth } from "./chat-room-app";

export function ProfileDialog(props) {
  const {
    open,
    requestClose,
    setErrors,
    setAlerts,
    photoUrl,
    setPhotoUrl,
    isVerified,
    isAnonymous,
  } = props;
  const [loadingImg, setLoadingImg] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);

  return (
    open && (
      <div className={styles["dialog"] + " " + styles["profile-editor"]}>
        <header>
          Edit profile
          <CloseIcon
            onClick={() => {
              requestClose();
            }}
          />
        </header>
        <div>
          <label className={loadingImg ? styles["loading"] : ""}>
            {photoUrl ? (
              <img className={styles["avatar"]} src={photoUrl} alt="profile" />
            ) : (
              <PersonIcon className={styles["avatar"]} />
            )}
            {!loadingImg && <PencilIcon />}
            <input
              type="file"
              onChange={(e) => {
                if (loadingImg) return;

                if (!e.target.files.length) {
                  return;
                }
                setLoadingImg(true);

                timeout(5000, async () => {
                  const file = e.target.files[0];
                  const url = await uploadFile(file);
                  if (!url) {
                    throw new CustomError("Error uploading file.");
                  }
                  await updateProfile(auth.currentUser, { photoURL: url });
                  setPhotoUrl(url);
                })
                  .catch((error) => {
                    setErrors([new CustomError(error.message, error)]);
                  })
                  .finally(() => {
                    setLoadingImg(false);
                  });
              }}
            />
          </label>

          {!isAnonymous && !isVerified && (
            <button
              className={loadingEmail ? styles["loading"] : ""}
              onClick={(e) => {
                e.preventDefault();

                if (loadingEmail) return;
                setLoadingEmail(true);

                timeout(5000, async () => {
                  const resendVerificationEmail = httpsCallable(
                    getFunctions(),
                    "resendVerificationEmail"
                  );

                  const result = await resendVerificationEmail({
                    returnUrl: window.location.href,
                  });

                  if (result.data.error) {
                    throw result.data.error;
                  } else {
                    setAlerts([result.data.message]);
                  }
                })
                  .catch((error) => {
                    setErrors([new CustomError(error.message, error)]);
                  })
                  .finally(() => {
                    setLoadingEmail(false);
                  });
              }}
            >
              Resend Verification Email
            </button>
          )}
        </div>
      </div>
    )
  );
}
