import { KvStorageDataSource } from '@src/datasources/Kv-storage';
import { AdminKvAsset, AdminKvAssetInput } from 'generated';
import { GraphQLError } from 'graphql';

export class KvStorageServiceAPI {
  private readonly kvDataSource: KvStorageDataSource;

  constructor(kvDataSource: KvStorageDataSource) {
    this.kvDataSource = kvDataSource;
  }

  async incrementTokenVersion(email: string): Promise<void> {
    await this.kvDataSource.incrementTokenVersion(email);
  }

  async adminKvAsset(input: AdminKvAssetInput, accessToken: string | null): Promise<AdminKvAsset> {
    if (!accessToken) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHORIZED' },
      });
    }
    return await this.kvDataSource.adminKvAsset(input);
  }
}
