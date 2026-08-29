import Counter from "../models/counter.js";

const generateBillNumber = async () => {
  const counter = await Counter.findOneAndUpdate(
    {
      name: "salesBill",
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

  return `BILL-${String(counter.sequence).padStart(6, "0")}`;
};


export default generateBillNumber;
