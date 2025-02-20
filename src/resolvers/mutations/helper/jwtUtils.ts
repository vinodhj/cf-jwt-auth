import { Role } from 'db/schema/user';
import { GraphQLError } from 'graphql';
import jwt, { SignOptions } from 'jsonwebtoken';

export interface TokenPayload {
  email: string;
  name: string;
  role: Role;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

export const generateToken = (payload: TokenPayload, secret: jwt.Secret, expiresIn: SignOptions['expiresIn']): string => {
  try {
    return jwt.sign(payload, secret, { expiresIn });
  } catch (error) {
    console.error('Error generating token:', error);
    throw new GraphQLError('Failed to generate token', {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        error,
      },
    });
  }
};

export const verifyToken = async (token: string, secret: string, kvNamespace: KVNamespace): Promise<TokenPayload> => {
  try {
    const payload = jwt.verify(token, secret) as TokenPayload;

    // Retrieve the current token version from KV.
    // (We use the user's email as the key identifier; adjust if you have a different unique identifier.)
    const storedVersionStr = await kvNamespace.get(`user:${payload.email}:tokenVersion`);
    const storedVersion = storedVersionStr ? parseInt(storedVersionStr) : 0;

    if (payload.tokenVersion !== storedVersion) {
      throw new GraphQLError('For security reasons, your session is no longer valid. Please sign in again', {
        extensions: {
          code: 'REVOKE_TOKEN_ERROR',
          error: `Token has been revoked. payload_version: ${payload.tokenVersion}, stored_version: ${storedVersion}`,
        },
      });
    }
    return payload;
  } catch (error) {
    console.error('Error verifying token:', error);
    // Save invalid token log to KVNamespace
    const logKey = `invalid-token:${new Date().toISOString()}`;
    const logValue = JSON.stringify({
      token,
      error: error,
      timestamp: new Date().toISOString(),
    });

    try {
      await kvNamespace.put(logKey, logValue);
      // console.info('Invalid token log saved to KVNamespace:', logKey, logValue);
    } catch (kvError) {
      console.error('Error saving invalid token log to KVNamespace:', kvError);
    }

    const isGraphQLError = error instanceof GraphQLError;
    throw new GraphQLError(isGraphQLError ? error.message : 'Invalid token', {
      extensions: {
        code: isGraphQLError && error.extensions?.code ? error.extensions.code : 'UNAUTHORIZED',
        // ...(isGraphQLError ? {} : { error }),
        error: isGraphQLError && error.extensions?.error ? error.extensions.error : error,
      },
    });
  }
};
