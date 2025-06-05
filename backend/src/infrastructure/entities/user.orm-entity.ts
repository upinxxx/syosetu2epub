import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
// 移除直接引用來避免循環依賴
// import { KindleDeliveryOrmEntity } from './kindle-delivery.orm-entity.js';

/**
 * 使用者資料實體 - 領域層
 */
@Entity('user')
export class UserOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, type: 'varchar' })
  googleId: string;

  @Column({ unique: true, type: 'varchar' })
  email: string;

  @Column({ type: 'varchar' })
  displayName: string;

  @Column({ nullable: true, type: 'varchar', length: 320 })
  kindleEmail: string | null;

  @Column({ default: 0, type: 'int' })
  dailyEmailQuota: number;

  @Column({ nullable: true, type: 'timestamp' })
  lastLoginAt: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  // 使用字符串引用避免循環依賴
  @OneToMany('KindleDeliveryOrmEntity', 'user')
  kindleDeliveries: any[];
}
