import { AuthDataSource } from './auth';
import { UserDataSource } from './user';
import { DrizzleD1Database } from 'drizzle-orm/d1';
import { Role } from 'db/schema/user';
import { KvStorageDataSource } from './Kv-storage';

export type SessionUserType = {
  id: string;
  role: Role;
  email: string;
  name: string;
} | null;

export class CfJwtAuthDataSource {
  private readonly authAPI: AuthDataSource;
  private readonly userAPI: UserDataSource;
  private readonly kvStorageService: KvStorageDataSource;

  constructor({ db, jwtKV, sessionUser }: { db: DrizzleD1Database; jwtKV: KVNamespace; sessionUser: SessionUserType }) {
    this.authAPI = new AuthDataSource({ db, jwtKV, sessionUser });
    this.userAPI = new UserDataSource({ db, jwtKV, sessionUser });
    this.kvStorageService = new KvStorageDataSource(jwtKV);
  }

  getAuthAPI() {
    return this.authAPI;
  }

  getUserAPI() {
    return this.userAPI;
  }

  getKvStorageService() {
    return this.kvStorageService;
  }
}
