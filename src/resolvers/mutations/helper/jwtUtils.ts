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
    })
  }
};

export const verifyToken = (token: string, secret: string): TokenPayload => {
  try {
    return jwt.verify(token, secret) as TokenPayload;
  } catch (error) {
    console.error('Error verifying token:', error); 
    throw new GraphQLError('Invalid token', {
      extensions: {
        code: 'UNAUTHORIZED',
        error,
      },
    })
  }
};
