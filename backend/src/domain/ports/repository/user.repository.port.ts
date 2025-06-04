import { User } from '../../entities/user.entity.js';
import { CrudRepository, PagedRepository } from './base.repository.port.js';

/**
 * User Repository Port
 */
export interface UserRepository
  extends CrudRepository<User>,
    PagedRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
}

export const USER_REPOSITORY_TOKEN = 'USER_REPOSITORY';

// 舊接口兼容層，方便漸進式遷移
export type PagedUserRepository = UserRepository;
