import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import paymentRoutes from './routes/payment.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configurable CORS
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigin === '*') return callback(null, true);
      const allowed = [allowedOrigin, 'http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];
      if (allowed.includes(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'BikeDoctor Backend',
    timestamp: new Date().toISOString(),
  });
});

// Payment API Routes
app.use('/api/payment', paymentRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 BikeDoctor Backend server running on port ${PORT}`);
  console.log(`👉 Health Check: http://localhost:${PORT}/api/health`);
});
