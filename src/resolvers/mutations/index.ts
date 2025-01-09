/* eslint-disable @typescript-eslint/naming-convention */
import { CfJwtAuthDataSource } from '@src/datasources';
import { GraphQLError } from 'graphql';
import { SignUpInput } from 'generated';

export const Mutation = {
  signUp: async (
    _: unknown,
    { input }: { input: SignUpInput },
    { datasources, environment }: { datasources: { cfJwtAuthDataSource: CfJwtAuthDataSource }; environment: string }
  ) => {
    try {
      return datasources.cfJwtAuthDataSource.signUp(input);
    } catch (error) {
      console.log(error);
      throw new GraphQLError('Failed to sign up', {
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
          error,
        },
      });
    }
  },
};
