import CloseIcon from "@material-ui/icons/Close";
import firebase from "firebase/app";
import { default as React, useState } from "react";
import {
  useCollectionData,
  useDocument,
  useDocumentData,
} from "react-firebase-hooks/firestore";
import ReactPaginate from "react-paginate";
import { settingsRef } from "../app";
import styles from "../css/chat-room.module.css";
import paginationStyles from "../css/pagination-controls.module.css";

export function FilteredWordsDialog(props) {
  const [word, setWord] = useState("");
  const query = props.open ? settingsRef.doc("filteredWords") : null;
  const [filteredWords, loading, error] = useDocumentData(query);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  const start = (page - 1) * itemsPerPage;
  const end = page * itemsPerPage;

  return (
    props.open && (
      <div className={styles["dialog"] + " " + styles["filtered-words"]}>
        <header>
          Filtered words
          <CloseIcon
            onClick={() => {
              props.requestClose();
            }}
          />
        </header>
        <main>
          {filteredWords &&
            filteredWords.list.slice(start, end).map((word) => {
              return (
                <div>
                  {word}{" "}
                  <a
                    href="#"
                    onClick={async (e) => {
                      e.preventDefault();
                      const newWords = [...filteredWords.list];
                      newWords.splice(newWords.indexOf(word));

                      settingsRef.doc("filteredWords").update({
                        list: firebase.firestore.FieldValue.arrayRemove(word),
                        regex: new RegExp(
                          newWords
                            // Escape special characters
                            .map((s) =>
                              s.replace(/[()[\]{}*+?^$|#.,\/\\\s-]/g, "\\$&")
                            )
                            // Sort for maximal munch
                            .sort((a, b) => b.length - a.length)
                            .join("|"),
                          "gi"
                        ).source,
                      });
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
              if (word) {
                settingsRef.doc("filteredWords").update({
                  list: firebase.firestore.FieldValue.arrayUnion(word),
                  regex: new RegExp(
                    [...new Set([...filteredWords.list, word])]
                      // Escape special characters
                      .map((s) =>
                        s.replace(/[()[\]{}*+?^$|#.,\/\\\s-]/g, "\\$&")
                      )
                      // Sort for maximal munch
                      .sort((a, b) => b.length - a.length)
                      .join("|"),
                    "gi"
                  ).source,
                });
              }
            }}
          >
            <input
              type="text"
              placeholder="word to filter"
              onInput={(e) => {
                setWord(e.target.value);
              }}
              value={word}
            />{" "}
            <button>Add</button>
          </form>
        </main>
        <footer className={paginationStyles["pagination-controls"]}>
          {filteredWords && (
            <ReactPaginate
              pageCount={Math.ceil(filteredWords.length / itemsPerPage)}
              pageRangeDisplayed={10}
              marginPagesDisplayed={2}
              onPageChange={(item) => {
                setPage(item.selected + 1);
              }}
              nextLabel={">"}
              previousLabel={"<"}
            />
          )}
        </footer>
      </div>
    )
  );
}
