import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { NovelOrmEntity } from '@/infrastructure/entities/novel.orm-entity.js';
import { JobStatus } from '@/domain/enums/job-status.enum.js';

@Entity('epub_job')
export class EpubJobOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  novelId: string;

  @ManyToOne(() => NovelOrmEntity)
  @JoinColumn({ name: 'novelId' })
  novel: NovelOrmEntity;

  @Column({
    type: 'varchar',
    enum: JobStatus,
    default: JobStatus.QUEUED,
  })
  status: JobStatus;

  @Column({ nullable: true, type: 'varchar' })
  publicUrl: string;

  @Column({ nullable: true, type: 'text' })
  errorMessage: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  completedAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  startedAt: Date;
}
