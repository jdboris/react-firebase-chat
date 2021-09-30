import CloseIcon from "@material-ui/icons/Close";
import PersonIcon from "@material-ui/icons/Person";
import PencilIcon from "@material-ui/icons/Create";
import { auth } from "../app";
import { default as React, useState } from "react";
import styles from "../css/chat-room.module.css";
import { uploadFile } from "../storage";
import { timeout } from "../utils";

export function ProfileDialog(props) {
  const { open, requestClose, setErrors, photoUrl, setPhotoUrl } = props;
  const [loading, setLoading] = useState(false);

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
          <label className={loading ? styles["loading"] : ""}>
            {photoUrl ? (
              <img className={styles["avatar"]} src={photoUrl} alt="profile" />
            ) : (
              <PersonIcon className={styles["avatar"]} />
            )}
            {!loading && <PencilIcon />}
            <input
              type="file"
              onChange={async (e) => {
                if (loading) return;
                try {
                  if (!e.target.files.length) {
                    return;
                  }
                  setLoading(true);
                  timeout(5000, async () => {
                    const file = e.target.files[0];
                    const url = await uploadFile(file);
                    if (!url) {
                      setErrors(["Error uploading file."]);
                      return;
                    }
                    await auth.currentUser.updateProfile({ photoURL: url });
                    setPhotoUrl(url);
                  }).then(() => {
                    setLoading(false);
                  });
                } catch (error) {
                  setErrors([error]);
                }
              }}
            />
          </label>
        </div>
      </div>
    )
  );
}
