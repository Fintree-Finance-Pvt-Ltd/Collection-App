import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import loanRoutes from './routes/payments.js';
import embifiDataRoutes from './routes/embifi.js';
import Repossession from './routes/repossession.js';
import user from './routes/user.js'
import session from './routes/session.js'
import dashboard from './routes/dashboard.js'
import tracking from './routes/map_tracking.js'
import formApplication from './routes/FintreeWebForm.js'
const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use("/uploads", express.static("uploads"));


app.use('/auth', authRoutes);
app.use('/loanDetails', loanRoutes);
app.use('/embifi', embifiDataRoutes);
app.use(Repossession);
app.use(user);
app.use(session)
app.use(dashboard)
app.use(tracking)
//website from
app.use(formApplication)

export default app;