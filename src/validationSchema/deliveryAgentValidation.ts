import * as yup from "yup";

export const step1Schema = yup.object({
  role: yup
    .string()
    .required("Portal Type is required")
    .oneOf(["DELIVERY_AGENT", "VEHICLE_AGENT"], "Invalid Portal Type"),

  fullName: yup
    .string()
    .required("Full name is required")
    .min(3, "Minimum 3 characters")
    .max(30, "Maximum 30 characters")
    .trim()
    .matches(/^[a-zA-Z\s]+$/, "Only alphabets allowed"),

  surname: yup
    .string()
    .required("Surname is required")
    .min(2, "Minimum 2 characters")
    .max(30, "Maximum 30 characters")
    .trim()
    .matches(/^[a-zA-Z\s]+$/, "Only alphabets allowed"),

  fatherOrSpouseName: yup
    .string()
    .required("Father/Spouse name is required")
    .min(2, "Minimum 2 characters")
    .max(30, "Maximum 30 characters")
    .trim()
    .matches(/^[a-zA-Z\s]+$/, "Only alphabets allowed"),

phone: yup
  .string()
  .required("Mobile number is required")
  .matches(/^[6-9]\d{9}$/, "Enter a valid Indian mobile number")
  .test(
    "not-all-same",
    "Invalid mobile number",
    (value) => !/^(\d)\1{9}$/.test(value || "")
  ),

 alternatePhone: yup
  .string()
  .nullable()
  .notRequired()
  .matches(/^[6-9]\d{9}$/, {
    message: "Enter a valid Indian mobile number",
    excludeEmptyString: true,
  })
  .test(
    "not-all-same",
    "Invalid mobile number",
    (value) => {
      if (!value) return true; // allow empty
      return !/^(\d)\1{9}$/.test(value);
    }
  )
  .notOneOf(
    [yup.ref("phone")],
    "Alternate mobile number must be different"
  ),

  email: yup
    .string()
    .required("Email is required")
    .email("Invalid email")
    .trim(),

  dob: yup
    .string()
    .required("Date of birth is required")
    .test("age-check", "You must be at least 18 years old", function (value) {
      if (!value) return false;

      const today = new Date();
      const dob = new Date(value);

      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();

      // Adjust age if birthday hasn't occurred yet this year
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < dob.getDate())
      ) {
        age--;
      }

      return age >= 18;
    }),
  gender: yup.string().required("Gender is required"),

  maritalStatus: yup.string().required("Marital status is required"),

  nationality: yup.string().required("Nationality is required"),
  // .min(2, "Minimum 2 characters")
  // .max(30, "Maximum 30 characters")
  // .trim()
  // .matches(/^[a-zA-Z\s]+$/, "Only alphabets allowed"),
});

export const step2Schema = yup.object({
  sameAsPermanent: yup.boolean(),

  permanentAddress: yup.object({
    doorNo: yup
      .string()
      .required("Door No / Flat No is required")
      .trim()
      .min(1, "Minimum 1 character")
      .max(20, "Maximum 20 characters"),

    roadNo: yup
      .string()
      .required("Road No is required")
      .trim()
      .min(1, "Minimum 1 character")
      .max(20, "Maximum 20 characters"),

    colony: yup
      .string()
      .required("Colony / Village is required")
      .trim()
      .min(2, "Minimum 2 characters")
      .max(50, "Maximum 50 characters"),

    mandal: yup
      .string()
      .required("Mandal is required")
      .trim()
      .min(2, "Minimum 2 characters")
      .max(50, "Maximum 50 characters"),

    state: yup.string().required("State is required").trim(),

    city: yup.string().required("City is required").trim(),

    pincode: yup
      .string()
      .required("Pincode is required")
      .matches(/^[0-9]{6}$/, "Pincode must be 6 digits"),
  }),

  communicationAddress: yup.object().when("sameAsPermanent", {
    is: false,
    then: () =>
      yup.object({
        doorNo: yup
          .string()
          .required("Door No / Flat No is required")
          .trim()
          .min(1, "Minimum 1 character")
          .max(20, "Maximum 20 characters"),

        roadNo: yup
          .string()
          .required("Road No is required")
          .trim()
          .min(1, "Minimum 1 character")
          .max(20, "Maximum 20 characters"),

        colony: yup
          .string()
          .required("Colony / Village is required")
          .trim()
          .min(2, "Minimum 2 characters")
          .max(50, "Maximum 50 characters"),

        mandal: yup
          .string()
          .required("Mandal is required")
          .trim()
          .min(2, "Minimum 2 characters")
          .max(50, "Maximum 50 characters"),

        state: yup.string().required("State is required").trim(),

        city: yup.string().required("City is required").trim(),

        pincode: yup
          .string()
          .required("Pincode is required")
          .matches(/^[0-9]{6}$/, "Pincode must be 6 digits"),
      }),
    otherwise: () => yup.object().notRequired(),
  }),
});

export const step3Schema = yup.object({
  education: yup.array().of(
    yup.object({
      qualification: yup
        .string()
        .trim()
        .max(50, "Maximum 50 characters")
        .optional()
        .nullable()
        .notRequired(),

      institution: yup
        .string()
        .trim()
        .max(100, "Maximum 100 characters")
        .optional()
        .nullable()
        .notRequired(),


    yearOfPassing: yup
  .string()
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .notRequired()
  .matches(/^\d{4}$/, {
    message: "Enter a valid year",
    excludeEmptyString: true,
  }),
      marksOrCgpa: yup
        .string()
        .trim()
        .max(10, "Maximum 10 characters")
        .optional(),

    }),
  ),

  hasExperience: yup
    .string()
    .required("Please select Yes or No")
    .oneOf(["yes", "no"], "Invalid selection"),

  experience: yup.array().when("hasExperience", {
    is: "yes",
    then: (schema) =>
      schema.of(
        yup.object({
          organization: yup
            .string()
            .required("Organization is required")
            .trim()
            .min(2, "Minimum 2 characters")
            .max(100, "Maximum 100 characters"),

          designation: yup
            .string()
            .required("Designation is required")
            .trim()
            .min(2, "Minimum 2 characters")
            .max(50, "Maximum 50 characters"),

          responsibilities: yup
            .string()
            .required("Responsibilities are required")
            .trim()
            .min(2, "Minimum 2 characters")
            .max(500, "Maximum 500 characters"),

          fromDate: yup
            .string()
            .required("From date is required")
            .matches(/^\d{4}$/, "Enter a valid year"),

          toDate: yup
            .string()
            .required("To date is required")
            .matches(/^\d{4}$/, "Enter a valid year")
            .test(
              "toDateAfterFromDate",
              "To date cannot be before From date",
              function (value) {
                const { fromDate } = this.parent;

                if (!fromDate || !value) return true;

                const fromYear = Number(fromDate);
                const toYear = Number(value);

                return toYear >= fromYear;
              }
            ),
        }),
      ),
    otherwise: () => yup.array().notRequired(),
  }),

paySlips: yup.array().when("hasExperience", {
  is: "yes",
  then: (schema) =>
    schema
      .of(
        yup.mixed().test("file-or-url", "Invalid file", (value) => {
          return value instanceof File || typeof value === "string";
        })
      )
      .test(
        "count-validation",
        "Upload either 1 PDF or exactly 6 images",
        (value = []) => {
          if (!value.length) return false;

          const pdfCount = value.filter(
            (v) => v instanceof File && v.type === "application/pdf"
          ).length;

          const imageCount = value.filter((v) => {
            if (v instanceof File) return v.type.startsWith("image/");
            if (typeof v === "string") return true;
            return false;
          }).length;

          if (pdfCount === 1 && value.length === 1) return true;
          if (imageCount === 6) return true;

          return false;
        }
      )
      .required("Pay slips are required"),

  otherwise: () => yup.array().notRequired().nullable(),
}),
});

export const step4Schema = yup.object({
  documents: yup
    .array()
    .of(
      yup.object({
        fileUrl: yup
          .string()
          .required("Document is required")
          .test(
            "fileType",
            "Unsupported file type. Only image or PDF is allowed",
            (value, context) => {
              if (!value) return false;
              const cleanValue = String(value).split("?")[0].split("#")[0];
              const lastSegment = cleanValue.split("/").pop() || "";
              const fileName = String(context?.parent?.fileName || "");

              // Some upload systems append tokens after extension:
              // e.g. "show.png-1774254952009"
              const hasAllowedToken = (text: string) =>
                /\.(png|jpe?g|pdf|webp|heic|heif|jfif|bmp|gif|tif|tiff)(?:$|[-_.])/i.test(
                  text,
                );

              // Primary check from filename (best source), then URL segment.
              if (fileName && hasAllowedToken(fileName)) return true;
              if (lastSegment && hasAllowedToken(lastSegment)) return true;

              // If URL has no visible extension at all, don't block valid uploaded assets.
              if (!lastSegment.includes(".")) return true;
              return false;
            },
          )
          .test(
            "fileSize",
            "File size must be less than 5MB",
            (value, context) => {
              const file = context?.parent?.file; // assuming you store the actual File object
              if (!file) return true; // skip if file object not available
              return file.size <= 5 * 1024 * 1024;
            },
          ),
      }),
    )
    .min(4, "All four documents are required")
    .required("Documents are required"),
});

export const step5Schema = yup.object({
  // ---------------- BANK DETAILS ----------------
  accountHolderName: yup
    .string()
    .required("Account holder name is required")
    .min(3, "Name must be at least 3 characters")
    .max(50, "Name can't exceed 50 characters"),

  bankName: yup
    .string()
    .required("Bank name is required")
    .min(3, "Bank name must be at least 3 characters")
    .max(50, "Bank name can't exceed 50 characters"),

  branchName: yup
    .string()
    .required("Branch name is required")
    .min(3, "Branch name must be at least 3 characters")
    .max(50, "Branch name can't exceed 50 characters"),

  accountNumber: yup
    .string()
    .required("Account number is required")
    .matches(/^[0-9]{10,16}$/, "Account number must be 10-16 digits"),

  ifscCode: yup
    .string()
    .required("IFSC code is required")
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code"),

  upiId: yup
    .string()
    .nullable()
    .notRequired()
    .matches(/^[\w.-]+@[\w.-]+$/, {
      message: "Invalid UPI ID. Example: example@upi",
      excludeEmptyString: true,
    }),

  // ---------------- CANCELLED CHEQUE ----------------
  cancelledCheque: yup.string().required("Cheque is required"),

  // ---------------- DECLARATIONS ----------------
  declaration1: yup.boolean().oneOf([true], "You must accept the declaration"),

  declaration2: yup.boolean().oneOf([true], "You must accept the declaration"),
});

// export const step5Schema = yup.object({
//   accountHolderName: yup.string().required("Required"),
//   bankName: yup.string().required("Required"),
//   branchName: yup.string().required("Required"),
//   accountNumber: yup.string().required("Required"),
//   ifscCode: yup
//     .string()
//     .required("Required")
//     .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC"),

//   upiId: yup.string().optional(),
// cancelledCheque: yup.string().required("Cheque is required"),
//   declaration1: yup.boolean().oneOf([true], "Required"),
//   declaration2: yup.boolean().oneOf([true], "Required"),
// });
