// import React, { useEffect, useState } from "react";
// import { storiesOf } from "@storybook/react";
// import { HiExternalLink } from "react-icons/hi";

// import { ChatRoomApp } from "../components/chat-room-app";
// import {
//   collection,
//   doc,
//   getDoc,
//   getFirestore,
//   updateDoc,
//   writeBatch,
// } from "firebase/firestore";
// import { useCollectionDataOnce } from "react-firebase-hooks/firestore";
// import { fonts } from "../utils/fonts";
// import { idConverter } from "../utils/firestore";

// const stories = storiesOf("App Test", module);

// const firestore = getFirestore();

// stories.add("Sandbox", () => {
//   const [users] = useCollectionDataOnce(
//     collection(firestore, "users").withConverter(idConverter)
//   );

//   // useEffect(() => console.log(users), [users])

//   return (
//     <button
//       onClick={async () => {
//         if (!users || !users.length) {
//           console.error("Users not done loading yet...");
//           return;
//         }

//         console.log("STARTING HUGE UPDATE...");
//         console.log("users (before): ", users);

//         for (
//           let start = 0, end = 499;
//           start < users.length;
//           start += 500, end += 500
//         ) {
//           const batch = writeBatch(firestore);

//           users.slice(start, end).forEach((user) => {
//             user &&
//               user.id &&
//               batch.update(doc(firestore, `users/${user.id}`), {
//                 nameColor: "nameColor" in user ? user.nameColor : "#000000",
//                 font: "font" in user ? user.font : fonts[0],
//                 fontColor: "fontColor" in user ? user.fontColor : "#000000",
//                 fontSize: "fontSize" in user ? user.fontSize : 13,
//                 msgBgImg: "msgBgImg" in user ? user.msgBgImg : "",
//                 msgBgColor: "msgBgColor" in user ? user.msgBgColor : "#FFFFFF",
//                 msgBgTransparency:
//                   "msgBgTransparency" in user ? user.msgBgTransparency : 1,
//                 msgBgRepeat:
//                   "msgBgRepeat" in user ? user.msgBgRepeat : "no-repeat",
//                 msgBgPosition:
//                   "msgBgPosition" in user
//                     ? user.msgBgPosition
//                     : "left 0px top 0px",
//                 msgBgImgTransparency:
//                   "msgBgImgTransparency" in user
//                     ? user.msgBgImgTransparency
//                     : 1,
//               });
//           });

//           // Commit the batch
//           await batch.commit();

//           console.log(`COMPLETE: ${start}-${end}`);
//         }

//         console.log("ALL DONE!");
//       }}
//     >
//       Give All Users Default Styles (if they have none)
//     </button>
//   );
// });
