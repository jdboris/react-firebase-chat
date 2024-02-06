import { loadStripe } from "@stripe/stripe-js";
import {
  addDoc,
  collection,
  getFirestore,
  onSnapshot,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

export function sendToStripe(
  uid,
  priceId,
  shouldLogout = true,
  metadata = null
) {
  return new Promise((resolve, reject) => {
    const returnUrl = new URL(window.location);
    if (shouldLogout) {
      // Force a logout to refresh the token for premium custom claims
      returnUrl.searchParams.set("chat-logout", "1");
    }

    addDoc(collection(getFirestore(), "users", uid, "checkout_sessions"), {
      price: priceId, // price Id from your products price in the Stripe Dashboard
      success_url: returnUrl.href, // return user to this screen on successful purchase
      cancel_url: window.location.href, // return user to this screen on failed purchase
      allow_promotion_codes: true,
      mode:
        metadata && metadata.recipients && metadata.recipients.length
          ? "payment"
          : "subscription",
      ...(metadata
        ? {
            metadata: {
              userId: uid,
              ...Object.fromEntries(
                Object.entries(metadata).map(([key, value]) => [
                  key,
                  JSON.stringify(value),
                ])
              ),
            },
            quantity: metadata.recipients ? metadata.recipients.length : 1,
          }
        : {}),
    }).then((docRef) => {
      // Wait for the checkoutSession to get attached by the extension
      onSnapshot(docRef, async (snap) => {
        const { error, sessionId } = snap.data();

        if (error) {
          // Show an error to your customer and inspect
          // your Cloud Function logs in the Firebase console.
          console.error(`An error occurred: ${error.message}`);
          reject();
        }

        if (sessionId) {
          // We have a session, let's redirect to Checkout
          console.log(`Redirecting...`);
          const stripe = await loadStripe(
            import.meta.env.VITE_STRIPE_PUBLIC_API_KEY
          );

          await stripe.redirectToCheckout({ sessionId });
          resolve();
        }
      });
    });
  });
}

export async function sendToCustomerPortal() {
  // had to update firebase.app().functions() to firebase.default.functions() and
  // removed the region from the functions call (from stripe firebase extension docs)
  const functionRef = httpsCallable(
    getFunctions(),
    "ext-firestore-stripe-subscriptions-createPortalLink"
  );
  const { data } = await functionRef({ returnUrl: window.location.origin });
  window.location.assign(data.url);
}
