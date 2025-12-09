// src/config/secondDatabase.js
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';

dotenv.config();

// 🔹 No entities here – we'll use ONLY raw SQL via dataSource.query()
const SecondDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB2_HOST,
  port: Number(process.env.DB2_PORT || 3306),
  username: process.env.DB2_USERNAME,
  password: process.env.DB2_PASSWORD,
  database: process.env.DB2_NAME,
  entities: [],              // ⬅️ IMPORTANT: empty
  synchronize: false,
  logging: false,
});

export default SecondDataSource;
