import CloseIcon from "@material-ui/icons/Close";
import React, { useState } from "react";
import { useCollectionData } from "react-firebase-hooks/firestore";
import { usersRef as usersRef, banUser, unbanUser } from "../app";
import styles from "../css/chat-room.module.css";

export function BanlistDialog(props) {
  const [username, setUsername] = useState("");

  const query = usersRef.orderBy("username").where("isBanned", "==", true);

  const [bannedUsers] = useCollectionData(query, { idField: "id" });

  return (
    props.open && (
      <div className={styles["dialog"] + " " + styles["moderators"]}>
        <header>
          Banlist
          <CloseIcon
            onClick={() => {
              props.requestClose();
            }}
          />
        </header>
        <main>
          {bannedUsers &&
            bannedUsers.map((user) => {
              return (
                <div>
                  {user.username}{" "}
                  <a
                    href="#"
                    onClick={async (e) => {
                      e.preventDefault();
                      console.log(await unbanUser(user.username));
                    }}
                  >
                    remove
                  </a>
                </div>
              );
            })}
          Ban user{" "}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (username) {
                console.log(await banUser(username));
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
