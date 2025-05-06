import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '@user/entities/user.entity.js';
import { EpubJob } from '@/epub/entities/epub-job.entity.js';

@Entity()
export class EmailLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => EpubJob)
  epubJob: EpubJob;

  @Column({ type: 'varchar' })
  toEmail: string;

  @Column({ default: 'success', type: 'varchar' })
  status: 'success' | 'failed';

  @Column({ nullable: true, type: 'text' })
  errorMessage: string;

  @Column({ nullable: true, type: 'varchar' })
  ip: string;

  @CreateDateColumn({ type: 'timestamp' })
  sentAt: Date;
}
