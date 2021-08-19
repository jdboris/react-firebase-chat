import CloseIcon from "@material-ui/icons/Close";
import firebase from "firebase/app";
import React, { useState } from "react";
import { useCollectionData } from "react-firebase-hooks/firestore";
import { usersRef as usersRef } from "../app";
import styles from "../css/chat-room.module.css";

export function ModeratorsDialog(props) {
  const [username, setUsername] = useState("");
  const addModerator = firebase.functions().httpsCallable("addModerator");
  const removeModerator = firebase.functions().httpsCallable("removeModerator");

  let query = usersRef.orderBy("username").where("isModerator", "==", true);

  const [mods] = useCollectionData(query, { idField: "id" });

  return (
    props.open && (
      <div className={styles["dialog"] + " " + styles["moderators"]}>
        <header>
          Moderators
          <CloseIcon
            onClick={() => {
              props.requestClose();
            }}
          />
        </header>
        <main>
          {mods &&
            mods.map((mod) => {
              return (
                <div>
                  {mod.username}{" "}
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      removeModerator(mod.username);
                    }}
                  >
                    remove
                  </a>
                </div>
              );
            })}
          Add moderator{" "}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (username) {
                addModerator(username);
              }
            }}
          >
            <input
              type="text"
              placeholder="Username"
              onInput={(e) => {
                setUsername(e.target.value);
              }}
              value={username}
            />{" "}
            <button>Add</button>
          </form>
        </main>
      </div>
    )
  );
}
