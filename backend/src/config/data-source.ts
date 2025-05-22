import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '../infrastructure/entities/user.orm-entity.js';
import { Novel } from '../infrastructure/entities/novel.orm-entity.js';
import { EmailLog } from '@email/entities/email-log.entity.js';
import * as dotenv from 'dotenv';
import { EpubJob } from '../shared/dto/epub-job.orm-entity.js';

dotenv.config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: false,
  logging: false,
  entities: [User, Novel, EpubJob, EmailLog],
  migrations: ['src/migrations/*.ts'],
  // migrations: ['dist/migrations/*.js'],
});
