import * as Picker from "emoji-picker-react/primitives";
import styles from "../css/emoji-selector.module.css";
import { CustomError } from "../utils/errors";

export function EmojiSelector(props) {
  return (
    <div className={styles.overlay}>
      <Picker.Root
        appearance="default"
        colorScheme="dark"
        className={styles.picker}
        searchPlaceholder="Search emotes and emoji"
        autoFocusSearch={false}
        onEmojiClick={({ emoji }) => {
          if (props.isAnonymous) {
            props.setErrors([new CustomError("Create an account to do that.")]);
            return;
          }
          props.onSelect(emoji);
        }}
      >
        <Picker.CategoryNav />
        <Picker.Search />
        <Picker.Viewport>
          <Picker.List />
          <Picker.Empty />
          <Picker.Loading />
          <Picker.LoadError />
        </Picker.Viewport>
      </Picker.Root>
    </div>
  );
}
