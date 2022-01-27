import { default as React, useEffect } from "react";
import Select, { components } from "react-select";
import css from "./user-select.module.css";

export function UserSelect({ users, style, value, onChange, onCancel }) {
  const options = users
    .filter((user) => user.username)
    .map((user) => {
      return { label: user.username, value: user.username };
    });

  const selectStyles = {
    container: (position, top, left, provided, state) => ({
      ...provided,
      position: "absolute",
      ...style,
      zIndex: 1,
    }),
    control: (provided, state) => ({
      ...provided,
      minHeight: "1.1em",
      border: 0,
      boxShadow: 0,
      background: 0,
      cursor: "pointer",
    }),
    input: ({ display, ...provided }) => ({
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
      background: "white",
      marginTop: 0,
      border: "1px solid #dedede",
      borderRadius: "0px",
    }),
    option: (
      { background, ...provided },
      { data, isDisabled, isFocused, isSelected }
    ) => {
      return {
        ...provided,
        // color: data.value === settings.liveChannelId ? "#ff7900" : "#9B4900",
        color: "#0084eb",
        cursor: "pointer",
        paddingTop: "5px",
        paddingBottom: "5px",
        whiteSpace: "nowrap",
        textDecoration: isFocused ? "underline" : "",
      };
    },
  };

  return (
    <Select
      style={style}
      className={css.userSelect}
      options={options}
      components={{
        DropdownIndicator: () => null,
        IndicatorSeparator: () => null,
        IndicatorsContainer: () => null,
      }}
      onKeyDown={(e) => {
        if (e.key === "Tab" || e.key === "Enter") {
          onCancel(" ");
        }
      }}
      onChange={onChange}
      styles={selectStyles}
      hideSelectedOptions={false}
      maxMenuHeight={150}
      inputValue={value}
      placeholder=""
      menuIsOpen={true}
      controlShouldRenderValue={false}
    />
  );
}
