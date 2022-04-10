// Errors[name][code]
export const errors = {
  FirebaseError: {
    "auth/wrong-password": {
      code: "auth/wrong-password",
      message: "Invalid email/password.",
    },
    "auth/user-not-found": {
      code: "auth/user-not-found",
      message: "Invalid email/password.",
    },
    "auth/missing-email": {
      code: "auth/missing-email",
      message: "Please enter your email address.",
    },
    "auth/too-many-requests": {
      code: "auth/too-many-requests",
      message: "Too many failed attempts. Try again later.",
    },
  },
  CustomError: {},
};

export class CustomError extends Error {
  constructor(message, { ...options } = { name: "", code: "" }) {
    super(message);

    Object.assign(this, {
      message: (message =
        errors[options.name] && errors[options.code]
          ? errors[options.name][options.code].message
          : message
          ? message
          : "Something went wrong. Please try again."),
      options,
    });
  }
}
