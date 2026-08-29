import mongoose from "mongoose";

const StockSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    millerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Party",
      required: true,
    },

    itemName: {
      type: String,
      required: true,
      trim: true,
    },

    totalQuantity: {
      type: Number,
      required: true,
      min: 0,
    },

    weightPerKatta: {
      type: Number,
      required: true,
      min: 0,
    },

    totalWeight: {
      type: Number,
      required: true,
      min: 0,
    },

    purchaseRate: {
      type: Number,
      required: true,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    remainingQuantity: {
      type: Number,
      required: true,
      min: 0,
    },

    remainingWeight: {
      type: Number,
      required: true,
      min: 0,
    },

    remainingAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    bhardanaRate: {
      type: Number,
      default: 0,
      min: 0,
    },

    bhardana: {
      type: Number,
      default: 0,
      min: 0,
    },

    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      required: true,
    },

    paymentType: {
      type: String,
      enum: ["cash", "udhar"],
      required: true,
    },

    dueDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    dueDate: {
      type: Date,
      default: null,
    },
    
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Stock ||
  mongoose.model("Stock", StockSchema);