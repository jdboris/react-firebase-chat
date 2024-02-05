import { Close as CloseIcon } from "@mui/icons-material";
import { useMemo } from "react";
import { default as React, useState } from "react";
import ReactPaginate from "react-paginate";
import styles from "../css/chat-room.module.css";
import paginationStyles from "../css/pagination-controls.module.css";

export function OnlineUsersDialog({ open, requestClose, onlineUsers }) {
  const [page, setPage] = useState(1);
  const itemsPerPage = 15;
  const start = (page - 1) * itemsPerPage;
  const end = page * itemsPerPage;

  const namedUsers = useMemo(
    () =>
      open &&
      onlineUsers.reduce((total, user) => {
        const copy = [...total];
        user.username && copy.push(user);
        return copy;
      }, []),
    [open, onlineUsers]
  );

  const unknownUserCount = open && onlineUsers.length - namedUsers.length;

  return (
    open && (
      <div className={styles["dialog"]}>
        <header>
          People here now
          <CloseIcon onClick={requestClose} />
        </header>
        <main>
          <ul>
            {namedUsers &&
              namedUsers.slice(start, end).map((user, i) => {
                return (
                  user.username && (
                    <li key={`online-${user.username}`}>{user.username}</li>
                  )
                );
              })}
          </ul>
          {unknownUserCount > 0 && `${unknownUserCount} unknown user(s)`}
        </main>
        <footer className={paginationStyles["pagination-controls"]}>
          {namedUsers && namedUsers.length > itemsPerPage && (
            <ReactPaginate
              initialPage={page - 1}
              pageCount={Math.ceil(namedUsers.length / itemsPerPage)}
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
