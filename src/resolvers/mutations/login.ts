import { CfJwtAuthDataSource } from '@src/datasources';
import { LoginInput } from 'generated';
import { validateInputs } from './helper/authValidators';
import { generateToken, TokenPayload } from './helper/jwtUtils';
import { GraphQLError } from 'graphql';

export const login = async (
  _: unknown,
  { input }: { input: LoginInput },
  { datasources, jwtSecret }: { datasources: { cfJwtAuthDataSource: CfJwtAuthDataSource }; jwtSecret: string }
) => {
  try {
    // Validate inputs
    validateInputs(input.email, input.password);

    // Login user
    const result = await datasources.cfJwtAuthDataSource.login(input);

    const tokenPayload: TokenPayload = {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      tokenVersion: result.token_version,
    };

    // Generate JWT token
    const token = generateToken(tokenPayload, jwtSecret, '8h');
    return {
      token,
      ...result,
    };
  } catch (error) {
    if (error instanceof GraphQLError || error instanceof Error) {
      // Re-throw GraphQL-specific errors
      throw error;
    }
    console.error('Unexpected error:', error);
    throw new GraphQLError('Failed to login', {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        error,
      },
    });
  }
};
