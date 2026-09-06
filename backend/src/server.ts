import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import routes from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'https://astral-arena-o8eo.vercel.app',
    credentials: true,
  })
);

// Capture raw body for Razorpay Webhook validation
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Rate limiter: 250 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 250,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);
 
app.use('/api', routes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Astral Arena API', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`[Astral Arena Backend] Operational on port ${PORT}`);
});