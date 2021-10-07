import { loadStripe } from "@stripe/stripe-js";
import { firestore } from "../app";
import firebase from "firebase/compat/app";

export async function sendToStripe(uid, priceId) {
  const returnUrl = new URL(window.location);
  // Force a logout to refresh the token for premium custom claims
  returnUrl.searchParams.set("chat-logout", "1");

  return firestore
    .collection("users")
    .doc(uid)
    .collection("checkout_sessions")
    .add({
      price: priceId, // price Id from your products price in the Stripe Dashboard
      success_url: returnUrl.href, // return user to this screen on successful purchase
      cancel_url: window.location.href, // return user to this screen on failed purchase
    })
    .then((docRef) => {
      // Wait for the checkoutSession to get attached by the extension
      docRef.onSnapshot(async (snap) => {
        const { error, sessionId } = snap.data();

        if (error) {
          // Show an error to your customer and inspect
          // your Cloud Function logs in the Firebase console.
          console.error(`An error occurred: ${error.message}`);
        }

        if (sessionId) {
          // We have a session, let's redirect to Checkout
          console.log(`redirecting`);
          const stripe = await loadStripe(
            process.env.REACT_APP_STRIPE_PUBLIC_API_KEY
          );

          await stripe.redirectToCheckout({ sessionId });
        }
      });
    });
}

export async function sendToCustomerPortal() {
  // had to update firebase.app().functions() to firebase.default.functions() and
  // removed the region from the functions call (from stripe firebase extension docs)
  const functionRef = firebase
    .functions()
    .httpsCallable("ext-firestore-stripe-subscriptions-createPortalLink");
  const { data } = await functionRef({ returnUrl: window.location.origin });
  window.location.assign(data.url);
}
