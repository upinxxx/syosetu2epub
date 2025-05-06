import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '@user/entities/user.entity.js';
import { Novel } from '@novel/entities/novel.entity.js';
import { EmailLog } from '@email/entities/email-log.entity.js';
import { Order } from '@order/entities/order.entity.js';
import * as dotenv from 'dotenv';
import { EpubJob } from '@/epub/entities/epub-job.entity.js';

dotenv.config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: false,
  logging: false,
  entities: [User, Novel, EpubJob, EmailLog, Order],
  migrations: ['src/migrations/*.ts'],
  // migrations: ['dist/migrations/*.js'],
});
