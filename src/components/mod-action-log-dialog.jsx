import CloseIcon from "@material-ui/icons/Close";
import React, { useState } from "react";
import { useCollectionData } from "react-firebase-hooks/firestore";
import ReactPaginate from "react-paginate";
import { modActionLogRef } from "../app";
import styles from "../css/chat-room.module.css";
import paginationStyles from "../css/pagination-controls.module.css";

export function ModActionLogDialog(props) {
  const query = props.open ? modActionLogRef.orderBy("date", "desc") : null;
  const [modActions] = useCollectionData(query, { idField: "id" });
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;
  const start = (page - 1) * itemsPerPage;
  const end = page * itemsPerPage;

  return (
    props.open && (
      <div className={styles["dialog"] + " " + styles["mod-action-log"]}>
        <header>
          Mod Action Log
          <CloseIcon
            onClick={() => {
              props.requestClose();
            }}
          />
        </header>
        <main>
          {modActions && (
            <>
              {modActions.slice(start, end).map((action) => {
                return (
                  <div>
                    {action.action}
                    <small>{action.date.toDate().toLocaleString()}</small>
                  </div>
                );
              })}
            </>
          )}
        </main>
        <footer className={paginationStyles["pagination-controls"]}>
          {modActions && (
            <ReactPaginate
              pageCount={Math.ceil(modActions.length / itemsPerPage)}
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
