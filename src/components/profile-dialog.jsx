import CloseIcon from "@material-ui/icons/Close";
import PersonIcon from "@material-ui/icons/Person";
import PencilIcon from "@material-ui/icons/Create";
import firebase from "firebase/compat/app";
import { auth } from "../app";
import { default as React, useState } from "react";
import styles from "../css/chat-room.module.css";
import { uploadFile } from "../utils/storage";
import { timeout } from "../utils/utils";
import { translateError } from "../utils/errors";

export function ProfileDialog(props) {
  const {
    open,
    requestClose,
    setErrors,
    setAlerts,
    photoUrl,
    setPhotoUrl,
    isVerified,
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
                    throw new Error("Error uploading file.");
                  }
                  await auth.currentUser.updateProfile({ photoURL: url });
                  setPhotoUrl(url);
                })
                  .catch((error) => {
                    setErrors([error.message]);
                  })
                  .finally(() => {
                    setLoadingImg(false);
                  });
              }}
            />
          </label>

          {!isVerified && (
            <button
              className={loadingEmail ? styles["loading"] : ""}
              onClick={(e) => {
                e.preventDefault();

                if (loadingEmail) return;
                setLoadingEmail(true);

                timeout(5000, async () => {
                  const resendVerificationEmail = firebase
                    .app()
                    .functions()
                    .httpsCallable("resendVerificationEmail");

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
                    setErrors([translateError(error).message]);
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
