import { Close as CloseIcon } from "@mui/icons-material";
import {
  arrayRemove,
  arrayUnion,
  doc,
  getFirestore,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { default as React, useState } from "react";
import { useDocumentData } from "react-firebase-hooks/firestore";
import ReactPaginate from "react-paginate";
import styles from "../css/chat-room.module.css";
import paginationStyles from "../css/pagination-controls.module.css";
import { CustomError } from "../utils/errors";

export function FilteredWordsDialog(props) {
  const [word, setWord] = useState("");
  const [errors, setErrors] = useState([]);
  const query = props.open
    ? doc(getFirestore(), "settings", "filteredWords")
    : null;
  const [filteredWords] = useDocumentData(query);
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
              setWord("");
              setErrors([]);
              props.requestClose();
            }}
          />
        </header>
        <main>
          {filteredWords &&
            filteredWords.list.slice(start, end).map((word, i) => {
              return (
                <div key={i}>
                  {word}{" "}
                  <button
                    className={styles["link"]}
                    onClick={async (e) => {
                      e.preventDefault();

                      const newWords = [...filteredWords.list];
                      newWords.splice(newWords.indexOf(word), 1);

                      updateDoc(
                        doc(getFirestore(), "settings", "filteredWords"),
                        {
                          list: arrayRemove(word),
                          regex: newWords.length
                            ? new RegExp(
                                newWords
                                  // Escape special characters
                                  .map((s) =>
                                    s.replace(
                                      /[()[\]{}*+?^$|#.,\\\s-]/g,
                                      "\\$&"
                                    )
                                  )
                                  // Sort for maximal munch
                                  .sort((a, b) => b.length - a.length)
                                  .join("|"),
                                "gi"
                              ).source
                            : null,
                        }
                      );
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

              if (word.length < 4) {
                setErrors([new CustomError("Word must be 4+ characters.")]);
                return;
              }
              const list = filteredWords ? filteredWords.list : [];

              setDoc(
                doc(getFirestore(), "settings", "filteredWords"),
                {
                  list: arrayUnion(word),
                  regex: new RegExp(
                    [...new Set([...list, word])]
                      // Escape special characters
                      .map((s) => s.replace(/[()[\]{}*+?^$|#.,\\\s-]/g, "\\$&"))
                      // Sort for maximal munch
                      .sort((a, b) => b.length - a.length)
                      .join("|"),
                    "gi"
                  ).source,
                },
                { merge: true }
              );

              setErrors([]);
            }}
          >
            {errors.map((error, i) => (
              <div key={i} className={styles["error"]}>
                {error.message}
              </div>
            ))}
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
