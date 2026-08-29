import Counter from "../models/counter.js";

const generateReceiptNumber = async () => {
  const counter = await Counter.findOneAndUpdate(
    {
      name: "stockReceipt",
    },
    {
      $inc: {
        sequence: 1,
      },
    },
    {
      new: true,
      upsert: true,
    }
  );

  return `RCPT-${String(counter.sequence).padStart(6, "0")}`;
};

export default generateReceiptNumber;
