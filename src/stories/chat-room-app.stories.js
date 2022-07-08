import React, { useEffect, useState } from "react";
import { storiesOf } from "@storybook/react";
import { HiExternalLink } from "react-icons/hi";

import { ChatRoomApp } from "../components/chat-room-app";

const stories = storiesOf("App Test", module);

stories.add("App", () => {
  const [user, setUser] = useState(null);
  const [callbackToTrigger, setCallbackToTrigger] = useState(null);

  useEffect(() => {
    setTimeout(() => {
      setCallbackToTrigger({ name: "test", arguments: [15] });
    }, 2000);
  }, []);

  return (
    <ChatRoomApp
      // callbacks={[
      //   function test(x) {
      //     console.log(x);
      //   },
      // ]}
      // callbackToTrigger={callbackToTrigger}
      headerLinks={[
        <a href="/chat" target="_blank" rel="noreferrer">
          <HiExternalLink />
        </a>,
      ]}
      onUserChange={(authUser) => {
        setUser(authUser);
      }}
    />
  );
});
