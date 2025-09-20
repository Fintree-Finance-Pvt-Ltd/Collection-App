// AppDataSource.js

// const { DataSource } = require('typeorm');
// const LoanDetails = require('../entities/paymentsDetails');
// const User = require('../entities/User');
// const Embifi = require('../entities/Embifi'); // This must also be an EntitySchema!
// const paymentImage=require('../entities/paymentsImage')
// const dotenv = require('dotenv');


import LoanDetails from '../entities/paymentsDetails.js';
import User from '../entities/User.js';
import Embifi from '../entities/Embifi.js';
import paymentImage from '../entities/paymentsImage.js';
import Repossession from '../entities/Repossession.js';
import RepossessionPhoto from '../entities/RepossessionPhoto.js'
import AuthEvent from '../entities/AuthEvent.js'
import 'reflect-metadata';
import dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config();




 export  const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  synchronize: true,
  logging: false,
  entities: [LoanDetails,paymentImage, User,AuthEvent, Embifi, Repossession, RepossessionPhoto],
  migrations: [],
  subscribers: [],
});


export default AppDataSource;
