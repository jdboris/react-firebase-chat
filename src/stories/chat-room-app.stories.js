import React, { useEffect, useState } from "react";
import { HiExternalLink } from "react-icons/hi";

import { ChatRoomApp } from "../components/chat-room-app";

export default {
  title: "App",
  component: ChatRoomApp,
};

export const Default = () => {
  const [user, setUser] = useState(null);
  const [callbackToTrigger, setCallbackToTrigger] = useState(null);

  useEffect(() => {
    setTimeout(() => {
      setCallbackToTrigger({ name: "test", arguments: [15] });
    }, 2000);
  }, []);

  return (
    <ChatRoomApp
      style={{ height: "600px", width: "400px" }}
      headerLinks={[
        <a href="/chat" target="_blank" rel="noreferrer" key="headerlink-1">
          <HiExternalLink />
        </a>,
      ]}
      callbackToTrigger={callbackToTrigger}
      onUserChange={() => {}}
    />
  );
};
