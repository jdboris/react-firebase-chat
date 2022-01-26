import { default as React } from "react";
import Select from "react-select";
import { css } from "./user-select.module.css";

export function UserSelect({ users }) {
  const selectStyles = {
    container: (provided, state) => ({
      ...provided,
    }),
    control: (provided, state) => ({
      ...provided,
      border: 0,
      boxShadow: 0,
      background: 0,
      cursor: "pointer",
    }),
    singleValue: (provided, { data }) => ({
      ...provided,
      // color: data.value === settings.liveChannelId ? "#ff7900" : "#9B4900",
      background: 0,
      textTransform: "uppercase",
      display: "flex",
      alignItems: "center",
      transition: "color 0.15s",
    }),
    indicatorSeparator: (provided, state) => ({
      ...provided,
      display: "none",
    }),
    valueContainer: (provided, state) => ({
      ...provided,
      paddingRight: "0",
    }),

    menu: ({ width, ...provided }, state) => ({
      ...provided,
      width: "max-content",
      minWidth: "100%",
      boxShadow: 0,
      background: 0,
      marginTop: 0,
    }),
    option: (
      { background, ...provided },
      { data, isDisabled, isFocused, isSelected }
    ) => {
      return {
        ...provided,
        background: "black",
        // color: data.value === settings.liveChannelId ? "#ff7900" : "#9B4900",
        cursor: "pointer",
        textTransform: "uppercase",
        paddingTop: "5px",
        paddingBottom: "5px",
        whiteSpace: "nowrap",
      };
    },
  };

  return (
    <Select
      className={css.userSelect}
      options={users.map((user) => {
        return { label: user.username, value: user.username };
      })}
      // value={users.filter((user) => user.value === selectedChannelId)}
      onChange={(e) => {
        // setSelectedChannelId(e.value);
        // showInModal(null);
      }}
      styles={selectStyles}
      hideSelectedOptions={true}
      maxMenuHeight={50}
    />
  );
}
