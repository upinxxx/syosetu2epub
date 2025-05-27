import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EpubJobOrmEntity } from './epub-job.orm-entity.js';
import { UserOrmEntity } from './user.orm-entity.js';
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

  @ManyToOne(() => EpubJobOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'epubJobId' })
  epubJob: EpubJobOrmEntity;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserOrmEntity;

  @Column({ type: 'varchar', length: 320 })
  toEmail: string;

  @Column({
    type: 'varchar',
    enum: DeliveryStatus,
    default: DeliveryStatus.QUEUED,
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
