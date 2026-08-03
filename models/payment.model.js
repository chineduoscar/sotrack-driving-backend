import mongoose from "mongoose";

const refereeSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: null },
    address: { type: String, trim: true, default: null },
    phoneNumber: { type: String, trim: true, default: null },
  },
  { _id: false },
);

const paymentSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    surname: {
      type: String,
      required: true,
      trim: true,
    },

    otherName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },

    contactAddress: {
      type: String,
      required: true,
      trim: true,
    },

    dateOfBirth: {
      type: String,
      required: true,
      trim: true,
    },

    stateOfOrigin: {
      type: String,
      required: true,
      trim: true,
    },

    maritalStatus: {
      type: String,
      required: true,
      trim: true,
    },

    homeTown: {
      type: String,
      required: true,
      trim: true,
    },

    qualification: {
      type: String,
      trim: true,
      default: null,
    },

    previousExperience: {
      type: String,
      trim: true,
      default: null,
    },

    languageSpoken: {
      type: String,
      required: true,
      trim: true,
    },

    agreeToRules: {
      type: Boolean,
      required: true,
      default: false,
    },

    referee: {
      type: refereeSchema,
      default: null,
    },

    zone: {
      type: String,
      required: true,
      trim: true,
    },

    zoneId: {
      type: Number,
      required: true,
    },

    package: {
      type: String,
      enum: ["standard", "executive", "weekend", "weekendExecutive"],
      required: true,
    },

    tier: {
      type: String,
      enum: ["nonExperience", "partialExperience", "refresher"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    reference: {
      type: String,
      required: true,
      unique: true,
    },

    paymentMethod: {
      type: String,
      default: null,
    },

    currency: {
      type: String,
      default: "NGN",
    },

    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },

    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
