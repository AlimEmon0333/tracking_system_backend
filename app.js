import express from "express";
import cors from "cors";

// Routes
import authRoutes from "./routes/authRoutes.js";
import partyRoutes from "./routes/partyRoutes.js";
import stockRoutes from "./routes/stockRoutes.js";
import salesRoutes from "./routes/salesRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import bankRoutes from "./routes/bankRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/party", partyRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/bank", bankRoutes);


export default app;
