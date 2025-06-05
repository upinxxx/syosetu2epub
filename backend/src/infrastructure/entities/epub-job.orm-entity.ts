import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { NovelOrmEntity } from '@/infrastructure/entities/novel.orm-entity.js';
// 移除直接引用來避免循環依賴
// import { UserOrmEntity } from '@/infrastructure/entities/user.orm-entity.js';
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

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  // 使用字符串引用避免循環依賴
  @ManyToOne('UserOrmEntity')
  @JoinColumn({ name: 'userId' })
  user: any | null;

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

  // 完全避免類型引用，讓 TypeORM 通過字符串處理關聯
  @OneToMany('KindleDeliveryOrmEntity', 'epubJob')
  kindleDeliveries: any[];
}
