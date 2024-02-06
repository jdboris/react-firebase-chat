import React from "react";
import ReactDOM from "react-dom/client";
import ChatRoomApp from "./index.js";
import { HiExternalLink } from "react-icons/hi";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ChatRoomApp
      style={{ height: "600px", width: "400px" }}
      headerLinks={[
        <a href="/chat" target="_blank" rel="noreferrer" key="headerlink-1">
          <HiExternalLink />
        </a>,
      ]}
      callbackToTrigger={{ name: "test", arguments: [15] }}
      onUserChange={() => {}}
    />
  </React.StrictMode>
);
