import { Close as CloseIcon, Search as SearchIcon } from "@mui/icons-material";
import { default as React, useMemo, useState } from "react";
import { useCollectionData } from "react-firebase-hooks/firestore";
import ReactPaginate from "react-paginate";
import styles from "../css/chat-room.module.css";
import paginationStyles from "../css/pagination-controls.module.css";
import { CustomError } from "../utils/errors";
import { timeout } from "../utils/utils";
import { idConverter } from "../utils/firestore";
import { banUser, unbanUser, usersRef } from "./chat-room-app";
import {
  collection,
  getFirestore,
  orderBy,
  query,
  where,
} from "firebase/firestore";

export function BanlistDialog(props) {
  const { setConfirmModal, setAlerts } = props;
  const [searchUsername, setSearchUsername] = useState("");
  const [banUsername, setBanUsername] = useState("");
  const [errors, setErrors] = useState([]);

  const [bannedUsers] = useCollectionData(
    props.open
      ? query(
          collection(getFirestore(), "users"),
          orderBy("lowercaseUsername"),
          where("isBanned", "==", true),
          where("lowercaseUsername", ">=", searchUsername),
          where("lowercaseUsername", "<=", searchUsername + "\uf8ff")
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
          Banlist
          <CloseIcon
            onClick={() => {
              setBanUsername("");
              setErrors([]);
              props.requestClose();
            }}
          />
        </header>
        <main>
          <label>
            <input
              type="text"
              placeholder="Username..."
              onInput={(e) => {
                setSearchUsername(e.target.value.toLowerCase());
                setPage(1);
              }}
              value={searchUsername}
            />
            <button className={styles["alt-button"]}>
              <SearchIcon />
            </button>
          </label>
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
                            setErrors([new CustomError(error.message, error)]);
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
                  const result = await banUser(banUsername);
                  setErrors([]);
                  if (result.data.message) {
                    setAlerts([result.data.message]);
                  }
                });
              } catch (error) {
                setErrors([new CustomError(error.message, error)]);
              }
            }}
          >
            {errors.map((error, i) => (
              <div key={i} className={styles["error"]}>
                {error.message}
              </div>
            ))}
            <input
              type="text"
              placeholder="Username"
              onInput={(e) => {
                setBanUsername(e.target.value);
              }}
              value={banUsername}
            />{" "}
            <button>Ban</button>
          </form>
        </main>
        <footer className={paginationStyles["pagination-controls"]}>
          {bannedUsers && (
            <ReactPaginate
              initialPage={page - 1}
              forcePage={page - 1}
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
