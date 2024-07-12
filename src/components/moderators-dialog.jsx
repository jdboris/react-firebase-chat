import { Close as CloseIcon } from "@mui/icons-material";
import { collection, getFirestore, query, where } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { default as React, useState } from "react";
import { useCollectionData } from "react-firebase-hooks/firestore";
import ReactPaginate from "react-paginate";
import styles from "../css/chat-room.module.css";
import paginationStyles from "../css/pagination-controls.module.css";
import { CustomError } from "../utils/errors";
import { idConverter } from "../utils/firestore";

export function ModeratorsDialog(props) {
  const [username, setUsername] = useState("");
  const [errors, setErrors] = useState([]);
  const addModerator = httpsCallable(getFunctions(), "addModerator");
  const removeModerator = httpsCallable(getFunctions(), "removeModerator");

  const [mods] = useCollectionData(
    props.open
      ? query(
          collection(getFirestore(), "users"),
          where("isModerator", "==", true)
        ).withConverter(idConverter)
      : null
  );
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
              setUsername("");
              setErrors([]);
              props.requestClose();
            }}
          />
        </header>
        <main>
          {mods &&
            mods.slice(start, end).map((mod, i) => {
              return (
                <div key={`moderators-dialog-mod-entry-${i}`}>
                  {mod.username}{" "}
                  <button
                    className={styles["link"]}
                    onClick={async () => {
                      const result = await removeModerator(mod.username);
                      if (result.error) {
                        setErrors([
                          new CustomError(result.error.message, result.error),
                        ]);
                      } else {
                        setErrors([]);
                      }
                    }}
                  >
                    remove
                  </button>
                </div>
              );
            })}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const result = await addModerator(username);
              if (result.data.error) {
                setErrors([
                  new CustomError(result.data.error.message, result.data.error),
                ]);
              } else {
                setErrors([]);
              }
            }}
          >
            {errors.map((error, i) => (
              <div
                key={`moderators-dialog-error-message-${i}`}
                className={styles["error"]}
              >
                {error.message}
              </div>
            ))}
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
                pageRangeDisplayed={5}
                marginPagesDisplayed={2}
                onPageChange={(item) => {
                  setPage(item.selected + 1);
                }}
                nextLabel={">"}
                previousLabel={"<"}
                disabledClassName={paginationStyles["disabled"]}
                activeClassName={paginationStyles["selected"]}
              />
            )}
          </footer>
        </main>
      </div>
    )
  );
}
