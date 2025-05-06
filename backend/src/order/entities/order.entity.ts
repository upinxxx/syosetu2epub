import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '@user/entities/user.entity.js';

@Entity()
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @Column({ type: 'varchar' })
  provider: string;

  @Column({ default: 'pending', type: 'varchar' })
  status: 'pending' | 'paid' | 'failed';

  @Column({ type: 'int' })
  amount: number;

  @Column({ nullable: true, type: 'varchar' })
  transactionId: string;

  @Column({ nullable: true, type: 'varchar' })
  ip: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
