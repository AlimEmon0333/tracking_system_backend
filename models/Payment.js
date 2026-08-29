import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["inflow", "outflow"],
      required: true, // "inflow" = received from Customer, "outflow" = paid to Supplier
    },
    partyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Party",
      required: true,
    },
    partyType: {
      type: String,
      enum: ["Buyer", "Miller"],
      required: true,
    },
    relatedType: {
      type: String,
      enum: ["Sale", "Stock", "General"],
      default: "General",
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "relatedType",
      default: null,
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: "",
    },
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer", "cheque", "online", "other"],
      default: "cash",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Payment ||
  mongoose.model("Payment", PaymentSchema);
