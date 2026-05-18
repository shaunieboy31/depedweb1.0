import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './lib/prisma';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Example Route for Transparency Seal
app.get('/api/transparency', async (req, res) => {
  try {
    const items = await prisma.transparencySeal.findMany({
      orderBy: [
        { category: 'asc' },
        { order: 'asc' }
      ]
    });
    res.json({ success: true, data: items });
  } catch (error) {
    console.error("Error fetching transparency items:", error);
    res.status(500).json({ success: false, error: "Failed to fetch items" });
  }
});

app.get('/api/carousel', async (req, res) => {
  try {
    const slides = await prisma.carouselSlide.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: slides });
  } catch (error) {
    console.error("Error fetching carousel slides:", error);
    res.status(500).json({ success: false, error: "Failed to fetch slides" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
