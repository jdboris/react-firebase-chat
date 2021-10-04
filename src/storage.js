import firebase from "firebase/app";

export async function uploadFile(file) {
  return new Promise((resolve, reject) => {
    const uploadFileFunction = firebase.functions().httpsCallable("uploadFile");

    const reader = new FileReader();

    reader.addEventListener(
      "load",
      () => {
        // Send the base64 string to backend to upload
        uploadFileFunction({
          base64FileString: reader.result,
          extension: file.name.split(".").pop(),
        })
          .then((result) => {
            resolve(result.data.url);
          })
          .catch((error) => {
            reject(error);
          });
      },
      false
    );

    // Convert image file to base64 string
    reader.readAsDataURL(file);
  });

  // const { uid } = auth.currentUser;

  // const storageRef = storage.ref();
  // // Form the filename, which will be checked (for the uid) in security rules
  // const fileRef = storageRef.child(
  //   `${uid}/${uuidv4()}.${file.name.split(".").pop()}`
  // );
  // await fileRef.put(file);
  // const url = await fileRef.getDownloadURL();

  // return url;
}
