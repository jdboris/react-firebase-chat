export function translateError(error) {
  if (!error.code) return error;

  if (error.code === "auth/wrong-password") {
    error.message = "Invalid email/password.";
  } else if (error.code === "auth/user-not-found") {
    error.message = "Invalid email/password.";
  } else if (error.code === "auth/missing-email") {
    error.message = "Please enter your email address.";
  }

  if (!error.message) {
    error.message = "Something went wrong. Please try again.";
  }

  return error;
}
