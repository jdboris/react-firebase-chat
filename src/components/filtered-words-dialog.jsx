import CloseIcon from "@material-ui/icons/Close";
import { default as React, useState } from "react";
import { useCollectionData } from "react-firebase-hooks/firestore";
import ReactPaginate from "react-paginate";
import { filteredWordsRef } from "../app";
import styles from "../css/chat-room.module.css";
import paginationStyles from "../css/pagination-controls.module.css";

export function FilteredWordsDialog(props) {
  const filterWord = firebase.functions().httpsCallable("filterWord");
  const unfilterWord = firebase.functions().httpsCallable("unfilterWord");

  const [word, setWord] = useState("");
  const query = props.open ? filteredWordsRef.orderBy("word") : null;
  const [filteredWords] = useCollectionData(query, { idField: "id" });
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
            filteredWords.slice(start, end).map((word) => {
              return (
                <div>
                  {word}{" "}
                  <a
                    href="#"
                    onClick={async (e) => {
                      e.preventDefault();
                      console.log(await unfilterWord(word));
                    }}
                  >
                    remove
                  </a>
                </div>
              );
            })}
          Filter word{" "}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (word) {
                console.log(await filterWord(word));
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
            />
          )}
        </footer>
      </div>
    )
  );
}
