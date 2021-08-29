import CloseIcon from "@material-ui/icons/Close";
import { default as React, useState } from "react";
import { useCollectionData } from "react-firebase-hooks/firestore";
import ReactPaginate from "react-paginate";
import { banUser, unbanUser, usersRef as usersRef } from "../app";
import styles from "../css/chat-room.module.css";
import paginationStyles from "../css/pagination-controls.module.css";

export function BanlistDialog(props) {
  const [username, setUsername] = useState("");
  const query = props.open
    ? usersRef.orderBy("username").where("isBanned", "==", true)
    : null;
  const [bannedUsers] = useCollectionData(query, { idField: "id" });
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
              props.requestClose();
            }}
          />
        </header>
        <main>
          {bannedUsers &&
            bannedUsers.slice(start, end).map((user) => {
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
            <button>Ban</button>
          </form>
        </main>
        <footer className={paginationStyles["pagination-controls"]}>
          {bannedUsers && (
            <ReactPaginate
              pageCount={Math.ceil(bannedUsers.length / itemsPerPage)}
              pageRangeDisplayed={10}
              marginPagesDisplayed={2}
              onPageChange={(item) => {
                setPage(item.selected + 1);
              }}
            />
          )}
        </footer>
      </div>
    )
  );
}
