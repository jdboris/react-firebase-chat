import CloseIcon from "@material-ui/icons/Close";
import firebase from "firebase/app";
import { default as React, useState } from "react";
import { useCollectionData } from "react-firebase-hooks/firestore";
import ReactPaginate from "react-paginate";
import { usersRef as usersRef } from "../app";
import styles from "../css/chat-room.module.css";
import paginationStyles from "../css/pagination-controls.module.css";

export function ModeratorsDialog(props) {
  const [username, setUsername] = useState("");
  const addModerator = firebase.functions().httpsCallable("addModerator");
  const removeModerator = firebase.functions().httpsCallable("removeModerator");

  let query = props.open
    ? usersRef.orderBy("username").where("isModerator", "==", true)
    : null;

  const [mods] = useCollectionData(query, { idField: "id" });
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  const start = (page - 1) * itemsPerPage;
  const end = page * itemsPerPage;

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
            mods.slice(start, end).map((mod) => {
              return (
                <div>
                  {mod.username}{" "}
                  <a
                    href="#"
                    onClick={async (e) => {
                      e.preventDefault();
                      console.log(await removeModerator(mod.username));
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
          <footer className={paginationStyles["pagination-controls"]}>
            {mods && (
              <ReactPaginate
                pageCount={Math.ceil(mods.length / itemsPerPage)}
                pageRangeDisplayed={10}
                marginPagesDisplayed={2}
                onPageChange={(item) => {
                  setPage(item.selected + 1);
                }}
              />
            )}
          </footer>
        </main>
      </div>
    )
  );
}
