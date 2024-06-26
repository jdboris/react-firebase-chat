import { Close as CloseIcon } from "@mui/icons-material";
import { collection, getFirestore, orderBy, query } from "firebase/firestore";
import React, { useState } from "react";
import { useCollectionData } from "react-firebase-hooks/firestore";
import ReactPaginate from "react-paginate";
import styles from "../css/chat-room.module.css";
import paginationStyles from "../css/pagination-controls.module.css";
import { idConverter } from "../utils/firestore";

export function ModActionLogDialog(props) {
  const [modActions] = useCollectionData(
    props.open
      ? query(
          collection(getFirestore(), "modActionLog"),
          orderBy("date", "desc")
        ).withConverter(idConverter)
      : null
  );
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
              {modActions.slice(start, end).map((action, i) => {
                return (
                  <div key={`mod-action-log-dialog-action-entry-${i}`}>
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
