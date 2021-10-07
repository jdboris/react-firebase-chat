import firebase from "firebase/compat/app";

let providers = null;

export function getProviders() {
  // If the provider list doesn't have all of the whitelist providers
  if (!providers) {
    // Fetch the list
    let getOembedProviders = firebase
      .functions()
      .httpsCallable("getOembedProviders");
    return getOembedProviders().then((result) => {
      if (!result.data.providers) {
        throw new Error("Failed to fetch providers from backend.");
      }
      providers = result.data.providers;
      return providers;
    });
  }

  return new Promise((resolve, reject) => {
    resolve(providers);
  });
}
