import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { UserOrmEntity } from './user.orm-entity.js';
import { EpubJobOrmEntity } from '../../shared/dto/epub-job.orm-entity.js';

@Entity()
export class EmailLogOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserOrmEntity)
  user: UserOrmEntity;

  @ManyToOne(() => EpubJobOrmEntity)
  epubJob: EpubJobOrmEntity;

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
