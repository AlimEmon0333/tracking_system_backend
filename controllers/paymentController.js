import Payment from "../models/Payment.js";
import Sales from "../models/sales.js";
import Stock from "../models/stock.js";
import Party from "../models/party.js";
import BankAccount from "../models/BankAccount.js";
import BankTransaction from "../models/BankTransaction.js";

// 1. Record a Payment (Inflow / Outflow)
export const recordPayment = async (req, res) => {
  try {
    const {
      type, // "inflow" or "outflow"
      partyId,
      partyType, // "Buyer" or "Miller"
      relatedType, // "Sale", "Stock", or "General"
      relatedId,
      referenceNumber,
      paymentDate,
      amount,
      paymentMethod,
      bankAccountId,
      notes,
    } = req.body;

    const numAmount = Number(amount);
    if (!type || !partyId || !numAmount || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Type, Party, and a valid positive amount are required.",
      });
    }

    const party = await Party.findOne({
      _id: partyId,
      userId: req.user._id,
    });

    if (!party) {
      return res.status(404).json({
        success: false,
        message: "Party not found.",
      });
    }

    let refNo = referenceNumber || "";

    // Handle Sale Invoice update
    if (relatedType === "Sale" && relatedId) {
      const sale = await Sales.findOne({
        _id: relatedId,
        userId: req.user._id,
      });

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: "Related sales invoice not found.",
        });
      }

      if (numAmount > Number(sale.remainingAmount)) {
        return res.status(400).json({
          success: false,
          message: `Payment amount (Rs. ${numAmount}) cannot exceed outstanding invoice balance (Rs. ${sale.remainingAmount}).`,
        });
      }

      sale.paidAmount = Number(sale.paidAmount || 0) + numAmount;
      sale.remainingAmount = Math.max(
        0,
        Number(sale.totalAmount) - Number(sale.paidAmount)
      );

      if (sale.remainingAmount <= 0) {
        sale.status = "paid";
      } else {
        sale.status = "partial";
      }

      await sale.save();
      if (!refNo) refNo = sale.billNumber;
    }

    // Handle Stock Purchase update
    if (relatedType === "Stock" && relatedId) {
      const stock = await Stock.findOne({
        _id: relatedId,
        userId: req.user._id,
      });

      if (!stock) {
        return res.status(404).json({
          success: false,
          message: "Related stock purchase not found.",
        });
      }

      if (numAmount > Number(stock.remainingAmount)) {
        return res.status(400).json({
          success: false,
          message: `Payment amount (Rs. ${numAmount}) cannot exceed outstanding purchase balance (Rs. ${stock.remainingAmount}).`,
        });
      }

      stock.paidAmount = Number(stock.paidAmount || 0) + numAmount;
      stock.remainingAmount = Math.max(
        0,
        Number(stock.totalAmount) - Number(stock.paidAmount)
      );

      if (stock.remainingAmount <= 0) {
        stock.status = "paid";
      } else {
        stock.status = "partial";
      }

      await stock.save();
      if (!refNo) refNo = stock.receiptNumber;
    }

    const payDate = paymentDate ? new Date(paymentDate) : new Date();

    const payment = await Payment.create({
      userId: req.user._id,
      type,
      partyId,
      partyType: partyType || party.type,
      relatedType: relatedType || "General",
      relatedId: relatedId || null,
      referenceNumber: refNo,
      paymentDate: payDate,
      amount: numAmount,
      paymentMethod: paymentMethod || "cash",
      notes: notes || "",
    });

    // Bank Account Balance Auto-Update
    let targetBankAccount = null;
    if (bankAccountId) {
      targetBankAccount = await BankAccount.findOne({
        _id: bankAccountId,
        userId: req.user._id,
      });
    } else {
      // Find default or first bank account
      targetBankAccount = await BankAccount.findOne({
        userId: req.user._id,
        isDefault: true,
      });
      if (!targetBankAccount) {
        targetBankAccount = await BankAccount.findOne({
          userId: req.user._id,
        });
      }
    }

    // Bank Account Balance Auto-Update: ONLY for supplier outflow payments.
    // Customer inflow payments do NOT auto-deposit to bank;
    // the user must manually deposit received cash via the Bank & Accounts page.
    if (targetBankAccount && type === "outflow") {
      let updatedBankBalance = Number(targetBankAccount.currentBalance || 0);

      updatedBankBalance -= numAmount;
      targetBankAccount.currentBalance = updatedBankBalance;
      await targetBankAccount.save();

      await BankTransaction.create({
        userId: req.user._id,
        bankAccountId: targetBankAccount._id,
        type: "supplier_payment",
        amount: numAmount,
        balanceAfter: updatedBankBalance,
        relatedType: "Payment",
        relatedId: payment._id,
        partyName: party.name,
        referenceNumber: refNo,
        paymentMethod: paymentMethod || "bank_transfer",
        date: payDate,
        notes: notes || `Payment to ${party.name} (${refNo})`,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Payment recorded successfully.",
      data: payment,
    });
  } catch (error) {
    console.error("Record Payment Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to record payment.",
    });
  }
};

// 2. Get Payments with Filtering
export const getPayments = async (req, res) => {
  try {
    const { type, partyId, relatedType, startDate, endDate } = req.query;

    const filter = { userId: req.user._id };

    if (type) filter.type = type;
    if (partyId) filter.partyId = partyId;
    if (relatedType) filter.relatedType = relatedType;

    if (startDate || endDate) {
      filter.paymentDate = {};
      if (startDate) filter.paymentDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.paymentDate.$lte = end;
      }
    }

    const payments = await Payment.find(filter)
      .populate("partyId", "name type phone")
      .sort({ paymentDate: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch payments.",
    });
  }
};

// 3. Delete Payment (with automatic rollback)
export const deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment transaction not found.",
      });
    }

    // Rollback on Sale
    if (payment.relatedType === "Sale" && payment.relatedId) {
      const sale = await Sales.findOne({
        _id: payment.relatedId,
        userId: req.user._id,
      });

      if (sale) {
        sale.paidAmount = Math.max(
          0,
          Number(sale.paidAmount || 0) - Number(payment.amount)
        );
        sale.remainingAmount = Math.max(
          0,
          Number(sale.totalAmount) - Number(sale.paidAmount)
        );

        if (sale.paidAmount <= 0) {
          sale.status = "unpaid";
        } else if (sale.remainingAmount > 0) {
          sale.status = "partial";
        } else {
          sale.status = "paid";
        }

        await sale.save();
      }
    }

    // Rollback on Stock
    if (payment.relatedType === "Stock" && payment.relatedId) {
      const stock = await Stock.findOne({
        _id: payment.relatedId,
        userId: req.user._id,
      });

      if (stock) {
        stock.paidAmount = Math.max(
          0,
          Number(stock.paidAmount || 0) - Number(payment.amount)
        );
        stock.remainingAmount = Math.max(
          0,
          Number(stock.totalAmount) - Number(stock.paidAmount)
        );

        if (stock.paidAmount <= 0) {
          stock.status = "unpaid";
        } else if (stock.remainingAmount > 0) {
          stock.status = "partial";
        } else {
          stock.status = "paid";
        }

        await stock.save();
      }
    }

    // Revert and delete linked BankTransaction if any
    const linkedBankTx = await BankTransaction.findOne({
      userId: req.user._id,
      relatedId: payment._id,
    });

    if (linkedBankTx) {
      const bankAccount = await BankAccount.findOne({
        _id: linkedBankTx.bankAccountId,
        userId: req.user._id,
      });

      if (bankAccount) {
        if (linkedBankTx.type === "supplier_payment") {
          // Add back the deducted amount
          bankAccount.currentBalance =
            Number(bankAccount.currentBalance || 0) + Number(linkedBankTx.amount);
        } else if (linkedBankTx.type === "customer_receipt") {
          // Subtract the added amount
          bankAccount.currentBalance = Math.max(
            0,
            Number(bankAccount.currentBalance || 0) - Number(linkedBankTx.amount)
          );
        }
        await bankAccount.save();
      }

      await linkedBankTx.deleteOne();
    }

    await payment.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Payment transaction deleted and balances rolled back successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete payment.",
    });
  }
};

// 4. Payment Dashboard & Reports Summary
export const getPaymentDashboardSummary = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Fetch all sales and stocks with outstanding balance
    const [sales, stocks, payments] = await Promise.all([
      Sales.find({ userId }).populate("buyerId", "name phone").sort({ date: -1 }),
      Stock.find({ userId }).populate("millerId", "name phone").sort({ date: -1 }),
      Payment.find({ userId }).populate("partyId", "name type").sort({ paymentDate: -1 }),
    ]);

    let totalReceivables = 0;
    let totalPayables = 0;
    let totalSalesAmount = 0;
    let totalStockAmount = 0;
    let totalProfit = 0;

    let overdueReceivables = [];
    let overduePayables = [];
    let upcomingReceivables = [];
    let upcomingPayables = [];

    // Process Sales (Receivables)
    sales.forEach((sale) => {
      const remaining = Number(sale.remainingAmount || 0);
      totalReceivables += remaining;
      totalSalesAmount += Number(sale.totalAmount || 0);
      totalProfit += Number(sale.profit || 0);

      if (remaining > 0) {
        const saleDate = new Date(sale.date);
        let dueDate = sale.dueDate ? new Date(sale.dueDate) : null;
        if (!dueDate) {
          const days = Number(sale.dueDays || 0);
          dueDate = new Date(saleDate.getTime() + days * 24 * 60 * 60 * 1000);
        }

        const isOverdue = dueDate < startOfToday;
        const diffMs = startOfToday.getTime() - dueDate.getTime();
        const daysOverdue = isOverdue
          ? Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
          : 0;

        const saleItem = {
          _id: sale._id,
          billNumber: sale.billNumber,
          date: sale.date,
          dueDate,
          daysOverdue,
          isOverdue,
          buyer: sale.buyerId,
          itemName: sale.itemName,
          totalAmount: sale.totalAmount,
          paidAmount: sale.paidAmount,
          remainingAmount: sale.remainingAmount,
          status: sale.status,
          paymentType: sale.paymentType,
        };

        if (isOverdue) {
          overdueReceivables.push(saleItem);
        } else {
          upcomingReceivables.push(saleItem);
        }
      }
    });

    // Process Stocks (Payables)
    stocks.forEach((stock) => {
      const remaining = Number(stock.remainingAmount || 0);
      totalPayables += remaining;
      totalStockAmount += Number(stock.totalAmount || 0);

      if (remaining > 0) {
        const stockDate = new Date(stock.date);
        let dueDate = stock.dueDate ? new Date(stock.dueDate) : null;
        if (!dueDate) {
          const days = Number(stock.dueDays || 0);
          dueDate = new Date(stockDate.getTime() + days * 24 * 60 * 60 * 1000);
        }

        const isOverdue = dueDate < startOfToday;
        const diffMs = startOfToday.getTime() - dueDate.getTime();
        const daysOverdue = isOverdue
          ? Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
          : 0;

        const stockItem = {
          _id: stock._id,
          receiptNumber: stock.receiptNumber,
          date: stock.date,
          dueDate,
          daysOverdue,
          isOverdue,
          miller: stock.millerId,
          itemName: stock.itemName,
          totalAmount: stock.totalAmount,
          paidAmount: stock.paidAmount,
          remainingAmount: stock.remainingAmount,
          status: stock.status,
          paymentType: stock.paymentType,
        };

        if (isOverdue) {
          overduePayables.push(stockItem);
        } else {
          upcomingPayables.push(stockItem);
        }
      }
    });

    // Calculate Inflows & Outflows from Payments
    let totalReceived = 0;
    let totalPaid = 0;

    payments.forEach((p) => {
      if (p.type === "inflow") {
        totalReceived += Number(p.amount || 0);
      } else if (p.type === "outflow") {
        totalPaid += Number(p.amount || 0);
      }
    });

    // Sort overdue by most days overdue descending
    overdueReceivables.sort((a, b) => b.daysOverdue - a.daysOverdue);
    overduePayables.sort((a, b) => b.daysOverdue - a.daysOverdue);

    // Sort upcoming by closest dueDate ascending
    upcomingReceivables.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    upcomingPayables.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    const totalOverdueReceivablesAmount = overdueReceivables.reduce(
      (sum, item) => sum + item.remainingAmount,
      0
    );
    const totalOverduePayablesAmount = overduePayables.reduce(
      (sum, item) => sum + item.remainingAmount,
      0
    );

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalSalesAmount,
          totalStockAmount,
          totalProfit,
          totalReceivables,
          totalPayables,
          totalReceived,
          totalPaid,
          overdueReceivablesCount: overdueReceivables.length,
          overdueReceivablesAmount: totalOverdueReceivablesAmount,
          overduePayablesCount: overduePayables.length,
          overduePayablesAmount: totalOverduePayablesAmount,
        },
        overdueReceivables,
        overduePayables,
        upcomingReceivables,
        upcomingPayables,
        recentPayments: payments.slice(0, 10),
      },
    });
  } catch (error) {
    console.error("Payment Dashboard Summary Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load payment dashboard summary.",
    });
  }
};
