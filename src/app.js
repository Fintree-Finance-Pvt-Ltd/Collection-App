import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import loanRoutes from './routes/payments.js';
import embifiDataRoutes from './routes/embifi.js';
import Repossession from './routes/repossession.js';
import user from './routes/user.js'
import session from './routes/session.js'
import dashboard from './routes/collection-portal/dashboard.js'
import tracking from './routes/collection-portal/map_tracking.js'
import formApplication from './routes/FintreeWebForm.js'
import totalCollections from './routes/collection-portal/collections.js';
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

app.use(formApplication)

//website apis
app.use('/web',totalCollections,tracking,dashboard)


export default app;