import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import { pool } from './database';
import { logger } from '../utils/logger';

dotenv.config();

export interface User {
  id: string;
  google_id: string;
  email: string;
  name: string;
  profile_picture?: string;
}

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (error) {
    logger.error('Error deserializing user', error);
    done(error, null);
  }
});

// Only configure Google OAuth if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
      },
      async (_accessToken, _refreshToken, profile, done) => {
      try {
        const { id, emails, displayName, photos } = profile;

        if (!emails || emails.length === 0) {
          return done(new Error('No email found in Google profile'), undefined);
        }

        const email = emails[0].value;
        const profilePicture = photos && photos.length > 0 ? photos[0].value : null;

        // Check if user exists
        let result = await pool.query('SELECT * FROM users WHERE google_id = $1', [id]);

        let user: User;

        if (result.rows.length === 0) {
          // Create new user
          result = await pool.query(
            `INSERT INTO users (google_id, email, name, profile_picture)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [id, email, displayName, profilePicture]
          );
          user = result.rows[0];
          logger.info('New user created', { userId: user.id, email: user.email });
        } else {
          // Update existing user
          result = await pool.query(
            `UPDATE users
             SET name = $1, profile_picture = $2, updated_at = CURRENT_TIMESTAMP
             WHERE google_id = $3
             RETURNING *`,
            [displayName, profilePicture, id]
          );
          user = result.rows[0];
          logger.info('User logged in', { userId: user.id, email: user.email });
        }

        return done(null, user);
      } catch (error) {
        logger.error('Error in Google OAuth strategy', error);
        return done(error as Error, undefined);
      }
    }
  )
  );
  logger.info('Google OAuth configured successfully');
} else {
  logger.warn('Google OAuth not configured - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET not found');
  logger.info('You can still test the API without Google OAuth');
}

export default passport;
