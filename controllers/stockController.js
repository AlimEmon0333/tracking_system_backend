import Stock from "../models/Stock.js";
import Party from "../models/Party.js";
import Payment from "../models/Payment.js";
import generateReceiptNumber from "../utils/generateReciptNumber.js";

export const createStock = async (req, res) => {
  try {
    const {
      date,
      millerId,
      itemName,
      totalQuantity,
      weightPerKatta,
      totalWeight,
      purchaseRate,
      totalAmount,
      remainingQuantity,
      remainingWeight,
      remainingAmount,
      bhardanaRate,
      bhardana,
      paidAmount,
      paymentType,
      dueDays,
      dueDate,
      status,
    } = req.body;


    const miller = await Party.findOne({
      _id: millerId,
      userId: req.user._id,
      type: "Miller",
    });

    if (!miller) {
      return res.status(404).json({
        success: false,
        message: "Miller not found",
      });
    }

    const receiptNumber = await generateReceiptNumber();

    const stockDate = date ? new Date(date) : new Date();
    let calculatedDueDate = dueDate ? new Date(dueDate) : null;
    if (!calculatedDueDate) {
      if (paymentType === "udhar" || paymentType === "Udhar") {
        const days = Number(dueDays || 0);
        calculatedDueDate = new Date(stockDate.getTime() + days * 24 * 60 * 60 * 1000);
      } else {
        calculatedDueDate = stockDate;
      }
    }

    const stock = await Stock.create({
      userId: req.user._id,

      date: stockDate,
      millerId,

      itemName,

      totalQuantity: Number(totalQuantity),
      weightPerKatta: Number(weightPerKatta),
      totalWeight: Number(totalWeight),

      purchaseRate: Number(purchaseRate),
      totalAmount: Number(totalAmount),

      remainingQuantity: Number(remainingQuantity),
      remainingWeight: Number(remainingWeight),
      remainingAmount: Number(remainingAmount),

      bhardanaRate: Number(bhardanaRate || 0),
      bhardana: Number(bhardana || 0),

      paidAmount: Number(paidAmount || 0),

      paymentType: paymentType ? paymentType.toLowerCase() : "cash",
      dueDays: Number(dueDays || 0),
      dueDate: calculatedDueDate,

      status,

      receiptNumber,
    });

    // If initial payment was made to supplier, log payment transaction
    if (Number(paidAmount) > 0) {
      await Payment.create({
        userId: req.user._id,
        type: "outflow",
        partyId: millerId,
        partyType: "Miller",
        relatedType: "Stock",
        relatedId: stock._id,
        referenceNumber: receiptNumber,
        paymentDate: stockDate,
        amount: Number(paidAmount),
        paymentMethod: "cash",
        notes: "Initial payment on stock purchase",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Stock added successfully.",
      data: stock,
    });
  } catch (error) {
    console.error("Create Stock Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating stock.",
      error: error.message,
    });
  }
};

export const getMillers = async (req, res) => {
  try {
    const millers = await Party.find({
      userId: req.user._id,
      type: "Miller",
    })
      .select("name")
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: millers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMillerDetails = async (req, res) => {
  try {
    const miller = await Party.findOne({
      _id: req.params.id,
      userId: req.user._id,
      type: "Miller",
    });

    if (!miller) {
      return res.status(404).json({
        success: false,
        message: "Miller not found",
      });
    }

    const stocks = await Stock.find({
      userId: req.user._id,
      millerId: req.params.id,
    }).sort({
      createdAt: -1,
    });

    const summary = {
      totalKatte: 0,
      totalWeight: 0,
      remainingKatte: 0,
      remainingWeight: 0,
      totalAmount: 0,
      paidAmount: 0,
    };

    stocks.forEach((stock) => {
      summary.totalKatte += stock.katte;
      summary.totalWeight += stock.totalWeight;
      summary.remainingKatte += stock.remainingKatte;
      summary.remainingWeight += stock.remainingWeight;
      summary.totalAmount += stock.totalAmount;
      summary.paidAmount += stock.paidAmount;
    });

    summary.pendingAmount = summary.totalAmount - summary.paidAmount;

    res.status(200).json({
      success: true,

      party: miller,

      summary,

      stocks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getStocks = async (req, res) => {
  try {
    const stocks = await Stock.find({
      userId: req.user._id,
    })
      .populate("millerId", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: stocks.length,
      data: stocks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getStockById = async (req, res) => {
  try {
    const stock = await Stock.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate("millerId", "name");

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: "Stock not found",
      });
    }

    res.status(200).json({
      success: true,
      data: stock,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const editStock = async (req, res) => {
  try {
    const stock = await Stock.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: "Stock not found",
      });
    }

    const {
      date,
      millerId,
      itemName,
      totalQuantity,
      weightPerKatta,
      totalWeight,
      purchaseRate,
      totalAmount,
      remainingQuantity,
      remainingWeight,
      remainingAmount,
      bhardanaRate,
      bhardana,
      paidAmount,
      paymentType,
      dueDays,
      status,
    } = req.body;

    // Check Miller
    const miller = await Party.findOne({
      _id: millerId,
      userId: req.user._id,
      type: "Miller",
    });

    if (!miller) {
      return res.status(404).json({
        success: false,
        message: "Miller not found",
      });
    }

    stock.date = date;
    stock.millerId = millerId;
    stock.itemName = itemName;

    stock.totalQuantity = totalQuantity;
    stock.weightPerKatta = weightPerKatta;
    stock.totalWeight = totalWeight;

    stock.purchaseRate = purchaseRate;
    stock.totalAmount = totalAmount;

    stock.remainingQuantity = remainingQuantity;
    stock.remainingWeight = remainingWeight;
    stock.remainingAmount = remainingAmount;

    stock.bhardanaRate = bhardanaRate;
    stock.bhardana = bhardana;

    stock.paidAmount = paidAmount;

    stock.paymentType = paymentType;
    stock.dueDays = dueDays;

    stock.status = status;

    await stock.save();

    return res.status(200).json({
      success: true,
      message: "Stock updated successfully.",
      data: stock,
    });
  } catch (error) {
    console.error("Edit Stock Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating stock.",
      error: error.message,
    });
  }
};
export const updateStock = async (req, res) => {
  try {
    const stock = await Stock.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: "Stock not found",
      });
    }

    const {
      remainingQuantity,
      remainingWeight,
    } = req.body;

    // Validation
    if (
      remainingQuantity === undefined ||
      remainingWeight === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Remaining Quantity and Remaining Weight are required",
      });
    }

    if (
      Number(remainingQuantity) < 0 ||
      Number(remainingWeight) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Remaining values cannot be negative",
      });
    }

    if (Number(remainingQuantity) > stock.totalQuantity) {
      return res.status(400).json({
        success: false,
        message: "Remaining Quantity cannot be greater than Total Quantity",
      });
    }

    if (Number(remainingWeight) > stock.totalWeight) {
      return res.status(400).json({
        success: false,
        message: "Remaining Weight cannot be greater than Total Weight",
      });
    }

    stock.remainingQuantity = Number(remainingQuantity);
    stock.remainingWeight = Number(remainingWeight);

    await stock.save();

    return res.status(200).json({
      success: true,
      message: "Stock updated successfully",
      data: stock,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteStock = async (req, res) => {
  try {
    const stock = await Stock.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: "Stock not found",
      });
    }

    await stock.deleteOne();

    res.status(200).json({
      success: true,
      message: "Stock deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
