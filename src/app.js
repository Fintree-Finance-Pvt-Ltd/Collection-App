import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import loanRoutes from './routes/payments.js';
import embifiDataRoutes from './routes/embifi.js';
import user from './routes/user.js'
const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use("/uploads", express.static("uploads"));


app.use('/auth', authRoutes);
app.use('/loanDetails', loanRoutes);
app.use('/embifi', embifiDataRoutes);
app.use(user)

export default app;