// src/config/database2.js (LMS Database)
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';

dotenv.config();

export const LMSDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB2_HOST,
  port: Number(process.env.DB2_PORT || 3306),
  username: process.env.DB2_USERNAME,
  password: process.env.DB2_PASSWORD,
  database: process.env.DB2_NAME,
  entities: [],
  synchronize: false,
  logging: false,
});

export const initializeLMSDatabase = async () => {
  if (!LMSDataSource.isInitialized) {
    await LMSDataSource.initialize();
  }
  return LMSDataSource;
};

export default LMSDataSource;
