import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DeliveryStatus } from '@/domain/enums/delivery-status.enum.js';

/**
 * Kindle 交付 ORM 實體
 */
@Entity('kindle_delivery')
export class KindleDeliveryOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  epubJobId: string;

  // 完全避免類型引用，讓 TypeORM 通過字符串處理關聯
  @ManyToOne('EpubJobOrmEntity', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'epubJobId' })
  epubJob: any;

  @Column({ type: 'uuid' })
  userId: string;

  // 使用字符串引用避免循環依賴
  @ManyToOne('UserOrmEntity', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: any;

  @Column({ type: 'varchar', length: 320 })
  toEmail: string;

  @Column({
    type: 'varchar',
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING,
  })
  status: DeliveryStatus;

  @Column({ nullable: true, type: 'text' })
  errorMessage: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  sentAt: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
