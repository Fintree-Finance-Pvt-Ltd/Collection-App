// AppDataSource.js

// const { DataSource } = require('typeorm');
// const LoanDetails = require('../entities/paymentsDetails');
// const User = require('../entities/User');
// const Embifi = require('../entities/Embifi'); // This must also be an EntitySchema!
// const paymentImage=require('../entities/paymentsImage')
// const dotenv = require('dotenv');

import malhotraReceipt from '../entities/malhotraReceipt.js'
import malhotraImage from '../entities/malhotraImage.js';
import MalhotraRepossession from '../entities/malhotraRepossession.js';
import payment from "../entities/Payment.js";
import PaymentImage from '../entities/PaymentImage.js';
import MalhotraRepoPhoto from '../entities/malhotraRepoPhoto.js'
import embifiReceipt from '../entities/embifiReceipt.js';
import User from '../entities/User.js';
import Embifi from '../entities/Embifi.js';
import embifiImage from '../entities/embifiImage.js';
import EmbifiRepossession from '../entities/EmbifiRepossession.js';
import EmbifiRepoPhoto from '../entities/EmbifiRepoPhoto.js'
// import AuthEvent from '../entities/AuthEvent.js'
import session from '../entities/user_sessions.js'
import 'reflect-metadata';
import dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import Repossession from '../entities/Repossession.js';
import RepossessionPhoto from '../entities/RepossessionPhoto.js';

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
  entities: [embifiReceipt,embifiImage, User, Embifi, EmbifiRepossession, EmbifiRepoPhoto,session,malhotraReceipt,malhotraImage,MalhotraRepossession,MalhotraRepoPhoto,payment,PaymentImage,Repossession,RepossessionPhoto],
  migrations: [],
  subscribers: [],
});


export default AppDataSource;
