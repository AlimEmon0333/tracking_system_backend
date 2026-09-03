import Party from "../models/party.js";
import Sales from "../models/sales.js";
import Stock from "../models/stock.js";
import Payment from "../models/Payment.js";

export const createParty = async (req, res) => {
  try {
    const { name, type, phone, address } = req.body;

    const party = await Party.create({
      userId: req.user._id,
      name,
      type,
      phone,
      address,
    });

    res.status(201).json({ 
      success: true,
      message: "Party created successfully",
      data: party,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getParties = async (req, res) => {
  try {
    const parties = await Party.find({
      userId: req.user._id,
    });

    res.status(200).json({
      success: true,
      data: parties,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getPartyById = async (req, res) => {
  try {
    const party = await Party.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!party) {
      return res.status(404).json({
        success: false,
        message: "Party not found",
      });
    }

    res.status(200).json({
      success: true,
      data: party,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateParty = async (req, res) => {
  try {
    const party = await Party.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id,
      },
      req.body,
      { new: true },
    );

    if (!party) {
      return res.status(404).json({
        success: false,
        message: "Party not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Party updated successfully",
      data: party,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteParty = async (req, res) => {
  try {
    const party = await Party.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!party) {
      return res.status(404).json({
        success: false,
        message: "Party not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Party deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getPartyDetails = async (req, res) => {
  try {
    const party = await Party.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!party) {
      return res.status(404).json({ success: false, message: "Party not found" });
    }

    // Get all sales for this party (if buyer)
    const sales = await Sales.find({
      buyerId: party._id,
      userId: req.user._id,
    }).sort({ date: -1 });

    // Get all stock purchases for this party (if miller/supplier)
    const stocks = await Stock.find({
      millerId: party._id,
      userId: req.user._id,
    }).sort({ date: -1 });

    // Get all payments involving this party
    const payments = await Payment.find({
      partyId: party._id,
      userId: req.user._id,
    }).sort({ paymentDate: -1 });

    // Financial aggregates
    const totalSales = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const totalProfit = sales.reduce((sum, s) => sum + (s.profit || 0), 0);
    const totalSalesCollected = sales.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
    const totalSalesRemaining = sales.reduce((sum, s) => sum + (s.remainingAmount || 0), 0);

    const totalPurchases = stocks.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const totalPurchasesPaid = stocks.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
    const totalPurchasesRemaining = stocks.reduce((sum, s) => sum + (s.remainingAmount || 0), 0);

    const totalPaymentsIn = payments
      .filter((p) => p.type === "inflow")
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPaymentsOut = payments
      .filter((p) => p.type === "outflow")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        party,
        financials: {
          totalSales,
          totalProfit,
          totalSalesCollected,
          totalSalesRemaining,
          totalPurchases,
          totalPurchasesPaid,
          totalPurchasesRemaining,
          totalPaymentsIn,
          totalPaymentsOut,
        },
        sales,
        stocks,
        payments,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
