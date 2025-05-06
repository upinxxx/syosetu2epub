import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '@user/entities/user.entity.js';
import { Novel } from '@novel/entities/novel.entity.js';

@Entity()
export class EpubJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: true })
  user: User;

  @ManyToOne(() => Novel)
  novel: Novel;

  @Column({ type: 'varchar' })
  publicUrl: string;

  @Column({ nullable: true, type: 'varchar' })
  ip: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
