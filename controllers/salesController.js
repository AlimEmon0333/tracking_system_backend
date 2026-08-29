import Sales from "../models/Sales.js";
import Stock from "../models/Stock.js";
import Party from "../models/Party.js";
import Payment from "../models/Payment.js";
import generateBillNumber from "../utils/generateBillNumber.js";

export const createSale = async (req, res) => {
  try {
    const {
      date,
      buyerId,
      stockId,
      itemName,
      quantity,
      weight,
      rate,
      purchaseRate,
      totalAmount,
      profit,
      bhardanaRate,
      bhardana,
      paidAmount,
      remainingAmount,
      status,
      paymentType,
      dueDays,
      dueDate,
    } = req.body;

    // Buyer Check
    const buyer = await Party.findOne({
      _id: buyerId,
      userId: req.user._id,
      type: "Buyer",
    });

    if (!buyer) {
      return res.status(404).json({
        success: false,
        message: "Buyer not found",
      });
    }

    // Stock Check
    const stock = await Stock.findOne({
      _id: stockId,
      userId: req.user._id,
    });

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: "Stock not found",
      });
    }

    if (Number(quantity) > Number(stock.remainingQuantity)) {
      return res.status(400).json({
        success: false,
        message: `Only ${stock.remainingQuantity} quantity available.`,
      });
    }

    const billNumber = await generateBillNumber();

    const saleDate = date ? new Date(date) : new Date();
    let calculatedDueDate = dueDate ? new Date(dueDate) : null;
    if (!calculatedDueDate) {
      if (paymentType === "udhar") {
        const days = Number(dueDays || 0);
        calculatedDueDate = new Date(saleDate.getTime() + days * 24 * 60 * 60 * 1000);
      } else {
        calculatedDueDate = saleDate;
      }
    }

    const sale = await Sales.create({
      userId: req.user._id,

      billNumber,

      date: saleDate,

      buyerId,

      stockId,

      itemName,

      quantity: Number(quantity),

      weight: Number(weight),

      rate: Number(rate),

      purchaseRate: Number(purchaseRate),

      totalAmount: Number(totalAmount),

      profit: Number(profit || 0),

      bhardanaRate: Number(bhardanaRate || 0),

      bhardana: Number(bhardana || 0),

      paidAmount: Number(paidAmount || 0),

      remainingAmount: Number(remainingAmount),

      status,

      paymentType,

      dueDays: Number(dueDays || 0),

      dueDate: calculatedDueDate,
    });

    // If initial payment was made, record payment transaction
    if (Number(paidAmount) > 0) {
      await Payment.create({
        userId: req.user._id,
        type: "inflow",
        partyId: buyerId,
        partyType: "Buyer",
        relatedType: "Sale",
        relatedId: sale._id,
        referenceNumber: billNumber,
        paymentDate: saleDate,
        amount: Number(paidAmount),
        paymentMethod: "cash",
        notes: "Initial payment on invoice creation",
      });
    }

    // Update Stock
    stock.remainingQuantity =
      Number(stock.remainingQuantity) - Number(quantity);

    stock.remainingWeight =
      Number(stock.remainingWeight) - Number(weight);

    if (stock.remainingQuantity <= 0) {
      stock.remainingQuantity = 0;
      stock.remainingWeight = 0;
    }

    await stock.save();

    res.status(201).json({
      success: true,
      message: "Sale created successfully",
      data: sale,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getBuyers = async (req, res) => {
  try {
    const buyers = await Party.find({
      userId: req.user._id,
      type: "Buyer",
    })
      .select("name")
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: buyers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSales = async (req, res) => {
  try {
    const sales = await Sales.find({
      userId: req.user._id,
    })
      .populate("buyerId", "name")
      .populate("stockId", "itemName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: sales.length,
      data: sales,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteSale = async (req, res) => {
  try {
    const sale = await Sales.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    const stock = await Stock.findOne({
      _id: sale.stockId,
      userId: req.user._id,
    });

    if (stock) {
      stock.remainingQuantity =
        Number(stock.remainingQuantity || 0) + Number(sale.quantity || 0);
      stock.remainingWeight =
        Number(stock.remainingWeight || 0) + Number(sale.weight || 0);
      await stock.save();
    }

    await sale.deleteOne();

    res.status(200).json({
      success: true,
      message: "Invoice deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};