/* eslint-disable @typescript-eslint/naming-convention */
import { CfJwtAuthDataSource } from '@src/datasources';
import { GraphQLError } from 'graphql';
import { SignUpInput } from 'generated';
import { validateInputs } from './helper/authValidators';

export const Mutation = {
  signUp: async (
    _: unknown,
    { input }: { input: SignUpInput },
    { datasources, environment }: { datasources: { cfJwtAuthDataSource: CfJwtAuthDataSource }; environment: string }
  ) => {
    try {
      // Validate inputs
      validateInputs(input.email, input.password);
      
      return datasources.cfJwtAuthDataSource.signUp(input);
    } catch (error) {
      if (error instanceof GraphQLError) {
        // Re-throw GraphQL-specific errors
        throw error;
      }
      console.error('Unexpected error:', error);
      throw new GraphQLError('Failed to sign up', {
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
          error,
        },
      });
    }
  },
};
