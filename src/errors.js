export function translateError(error) {
  if (!error.code) return error;

  const newError = { ...error };

  if (newError.code === "auth/wrong-password") {
    newError.message = "Invalid email/password.";
  } else if (newError.code === "auth/user-not-found") {
    newError.message = "Invalid email/password.";
  }

  return newError;
}
