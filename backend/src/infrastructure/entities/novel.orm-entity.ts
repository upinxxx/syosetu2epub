import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * 小說資料實體 - 領域層
 */
@Entity('novel')
export class NovelOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  source: string;

  @Column({ type: 'varchar' })
  sourceId: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ nullable: true, type: 'varchar' })
  author: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ nullable: true, type: 'varchar' })
  coverUrl: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  novelUpdatedAt: Date;
}
