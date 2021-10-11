import React, { useEffect, useState } from "react";
import { storiesOf } from "@storybook/react";

import { ChatRoomApp } from "../components/chat-room-app";

const stories = storiesOf("App Test", module);

stories.add("App", () => {
  const [user, setUser] = useState(null);

  return (
    <ChatRoomApp
      onAuthChange={(authUser) => {
        setUser(authUser);
      }}
    />
  );
});
