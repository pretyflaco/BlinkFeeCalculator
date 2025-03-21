import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fetch from "node-fetch";
import { mempoolFeeSchema, type MempoolFee } from "@shared/schema";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // API route to get mempool fee data
  app.get("/api/fees/recommended", async (req, res) => {
    try {
      const response = await fetch("https://mempool.space/api/v1/fees/recommended");
      
      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({
          message: `Error from mempool.space API: ${errorText || response.statusText}`
        });
      }
      
      const data = await response.json();
      
      // Validate the response data against our schema
      const validatedData = mempoolFeeSchema.parse(data);
      
      res.json(validatedData);
    } catch (error) {
      console.error("Error fetching mempool fee data:", error);
      
      if (error instanceof ZodError) {
        return res.status(500).json({
          message: "Invalid data format received from mempool.space API",
          details: error.errors
        });
      }
      
      res.status(500).json({
        message: "Failed to fetch fee data from mempool.space API",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // API route to calculate transaction fee
  app.post("/api/calculate-fee", (req, res) => {
    try {
      const { paymentAmount, feeRate, vbyteSize = 209 } = req.body;
      
      if (typeof feeRate !== 'number' || feeRate <= 0) {
        return res.status(400).json({ message: "Invalid fee rate" });
      }
      
      // Calculate fee in satoshis
      const feeSats = vbyteSize * feeRate;
      
      // Convert to BTC (1 BTC = 100,000,000 sats)
      const feeBTC = feeSats / 100000000;
      
      res.json({
        transactionSize: vbyteSize,
        feeRate,
        feeSats,
        feeBTC
      });
    } catch (error) {
      console.error("Error calculating fee:", error);
      res.status(500).json({
        message: "Failed to calculate fee",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
