// AppDataSource.js

const { DataSource } = require('typeorm');
const LoanDetails = require('../entities/paymentsDetails');
const User = require('../entities/User');
const Embifi = require('../entities/Embifi'); // This must also be an EntitySchema!
const paymentImage=require('../entities/paymentsImage')
const dotenv = require('dotenv');

dotenv.config();

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  synchronize: true,
  logging: false,
  entities: [LoanDetails,paymentImage, User, Embifi],
  migrations: [],
  subscribers: [],
});

module.exports = AppDataSource;
