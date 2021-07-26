import { firestore, auth, storage } from "./app";
import { uuidv4 } from "./uuid";

export async function uploadFile(file) {
  const { uid } = auth.currentUser;

  const storageRef = storage.ref();
  // Form the filename, which will be checked (for the uid) in security rules
  const fileRef = storageRef.child(
    `${uid}/${uuidv4()}.${file.name.split(".").pop()}`
  );
  await fileRef.put(file);
  const url = await fileRef.getDownloadURL();

  return url;
}
