import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { UserOrmEntity } from '../infrastructure/entities/user.orm-entity.js';
import { NovelOrmEntity } from '../infrastructure/entities/novel.orm-entity.js';
import * as dotenv from 'dotenv';
import { EpubJobOrmEntity } from '../infrastructure/entities/epub-job.orm-entity.js';
import { KindleDeliveryOrmEntity } from '../infrastructure/entities/kindle-delivery.orm-entity.js';

dotenv.config();

export default new DataSource({
  type: 'postgres',
  url: process.env.DB_URL,
  synchronize: false,
  logging: false,
  entities: [
    UserOrmEntity,
    NovelOrmEntity,
    EpubJobOrmEntity,
    KindleDeliveryOrmEntity,
  ],
  migrations: ['src/migrations/*.ts'],
  // migrations: ['dist/migrations/*.js'],
});
