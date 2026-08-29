import Party from "../models/party.js";

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
