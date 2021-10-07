import React from "react";
import { storiesOf } from "@storybook/react";

import { ChatRoomApp } from "../components/chat-room-app";

const stories = storiesOf("App Test", module);

stories.add("App", () => {
  return <ChatRoomApp />;
});
