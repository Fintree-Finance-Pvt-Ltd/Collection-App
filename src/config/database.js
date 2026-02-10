

import payment from "../entities/Payment.js";
import PaymentImage from '../entities/PaymentImage.js';

import User from '../entities/User.js';
import Embifi from '../entities/Embifi.js';

// import AuthEvent from '../entities/AuthEvent.js'
import session from '../entities/user_sessions.js'
import 'reflect-metadata';
import dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import Repossession from '../entities/Repossession.js';
import RepossessionPhoto from '../entities/RepossessionPhoto.js';
import CustomerVisit from "../entities/MyVisits.js"

dotenv.config();




 export  const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  synchronize: false,
  logging: false,
  entities: [ User,session,Embifi,payment,PaymentImage,Repossession,RepossessionPhoto,CustomerVisit],
  migrations: [],
  subscribers: [],
});


export default AppDataSource;
