import { User } from '../entities/user.entity.js';

export const USER_AUTH_PORT_TOKEN = Symbol('UserAuthPort');

/**
 * 谷歌認證資料
 */
export type GoogleProfile = {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
};

/**
 * 入站埠：使用者認證用例
 */
export interface UserAuthPort {
  validateOrCreateUser(profile: GoogleProfile): Promise<User>;
  getCurrentUser(userId: string): Promise<User>;
  generateToken(user: User): string;
}

/**
 * 出站埠：外部身份驗證提供商
 */
export interface ExternalAuthProvider {
  authenticate(credentials: any): Promise<GoogleProfile>;
}
