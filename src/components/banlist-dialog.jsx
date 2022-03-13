import { Close as CloseIcon } from "@mui/icons-material";
import { default as React, useState } from "react";
import { useCollectionData } from "react-firebase-hooks/firestore";
import ReactPaginate from "react-paginate";
import styles from "../css/chat-room.module.css";
import paginationStyles from "../css/pagination-controls.module.css";
import { translateError } from "../utils/errors";
import { timeout } from "../utils/utils";
import { idConverter } from "../utils/firestore";
import { banUser, unbanUser, usersRef } from "./chat-room-app";

export function BanlistDialog(props) {
  const { setConfirmModal, setAlerts } = props;
  const [username, setUsername] = useState("");
  const [errors, setErrors] = useState([]);
  const query = props.open
    ? usersRef
        .orderBy("lowercaseUsername")
        .where("isBanned", "==", true)
        .withConverter(idConverter)
    : null;
  const [bannedUsers] = useCollectionData(query);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  const start = (page - 1) * itemsPerPage;
  const end = page * itemsPerPage;

  return (
    props.open && (
      <div className={styles["dialog"] + " " + styles["moderators"]}>
        <header>
          Banlist
          <CloseIcon
            onClick={() => {
              setUsername("");
              setErrors([]);
              props.requestClose();
            }}
          />
        </header>
        <main>
          {bannedUsers &&
            bannedUsers.slice(start, end).map((user, i) => {
              return (
                <div key={i}>
                  {user.username}{" "}
                  <button
                    className={styles["link"]}
                    onClick={async () => {
                      setConfirmModal({
                        message: (
                          <>
                            Unban user {user.username}? <br />
                            <small>
                              This will also unban all accounts that have been
                              accessed by any IP addresses associated with{" "}
                              {user.username}.
                            </small>
                          </>
                        ),
                        Unban: async () => {
                          setConfirmModal(null);
                          try {
                            await timeout(5000, async () => {
                              const result = await unbanUser(user.username);
                              setErrors([]);
                              if (result.data.message) {
                                setAlerts([result.data.message]);
                              }
                            });
                          } catch (error) {
                            setErrors([translateError(error).message]);
                          }
                        },
                        Cancel: () => {
                          setConfirmModal(null);
                        },
                      });
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
              try {
                await timeout(5000, async () => {
                  const result = await banUser(username);
                  setErrors([]);
                  if (result.data.message) {
                    setAlerts([result.data.message]);
                  }
                });
              } catch (error) {
                setErrors([translateError(error).message]);
              }
            }}
          >
            {errors.map((error, i) => (
              <div key={i} className={styles["error"]}>
                {error}
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
            <button>Ban</button>
          </form>
        </main>
        <footer className={paginationStyles["pagination-controls"]}>
          {bannedUsers && (
            <ReactPaginate
              initialPage={page - 1}
              pageCount={Math.ceil(bannedUsers.length / itemsPerPage)}
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
      </div>
    )
  );
}
