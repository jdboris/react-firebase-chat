import CloseIcon from "@material-ui/icons/Close";
import { default as React, useState } from "react";
import { useCollectionData } from "react-firebase-hooks/firestore";
import ReactPaginate from "react-paginate";
import { banUser, unbanUser, usersRef } from "../app";
import styles from "../css/chat-room.module.css";
import paginationStyles from "../css/pagination-controls.module.css";

export function BanlistDialog(props) {
  const [username, setUsername] = useState("");
  const [errors, setErrors] = useState([]);
  const query = props.open
    ? usersRef.orderBy("lowercaseUsername").where("isBanned", "==", true)
    : null;
  const [bannedUsers] = useCollectionData(query, {
    idField: "id",
  });
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
                      const result = await unbanUser(user.username);
                      if (result.data.error) {
                        setErrors([result.data.error]);
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
              const result = await banUser(username);
              if (result.data.error) {
                setErrors([result.data.error]);
              } else {
                setErrors([]);
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
              pageCount={Math.ceil(bannedUsers.length / itemsPerPage)}
              pageRangeDisplayed={10}
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
