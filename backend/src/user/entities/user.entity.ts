import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, type: 'varchar' })
  googleId: string;

  @Column({ unique: true, type: 'varchar' })
  email: string;

  @Column({ type: 'varchar' })
  displayName: string;

  @Column({ default: 'free', type: 'varchar' })
  role: 'free' | 'pro';

  @Column({ nullable: true, type: 'timestamp' })
  upgradedAt: Date;

  @Column({ default: 0, type: 'int' })
  dailyEmailQuota: number;

  @Column({ nullable: true, type: 'timestamp' })
  lastLoginAt: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
