import { GraphQLError } from 'graphql';
import jwt from 'jsonwebtoken';

export interface TokenPayload {
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

export const generateToken = (payload: TokenPayload, secret: string, expiresIn: string): string => {
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
    return jwt.verify(token, secret) as TokenPayload;
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
      console.info('Invalid token log saved to KVNamespace:', logKey);
    } catch (kvError) {
      console.error('Error saving invalid token log to KVNamespace:', kvError);
    }

    throw new GraphQLError('Invalid token', {
      extensions: {
        code: 'UNAUTHORIZED',
        error,
      },
    });
  }
};
