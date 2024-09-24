import { Router } from 'express';
import passport from '../config/passport';
import axios from 'axios';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const router = Router();

interface User {
  id: string;
  displayName: string;
  emails: { value: string }[];
}
// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
// Google callback route
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/' }), async (req, res) => {
  try {
    const userProfile = req.user as any; // Keeping profile type as any
    // console.log(userProfile);
    
    const userEmail = userProfile.emails[0].value; // Accessing emails
    // console.log(userEmail);
    // Generate JWT token
    const token = jwt.sign({ email: userEmail }, process.env.JWT_SECRET!, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ email: userEmail }, process.env.JWT_SECRET!, { expiresIn: '7d' });
  
    // Set tokens in cookies
    res.cookie('token', token); // Set secure to true in production
    res.cookie('refreshToken', refreshToken); // Set secure to true in production
    
    // Redirect to your frontend or desired route
    res.redirect('/c'); // Change this to the frontend URL or another route as needed
  } catch (error) {
    console.log(error);
    
  }

});

// Facebook OAuth
router.get('/facebook', passport.authenticate('facebook'));
router.get('/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/' }), (req, res) => {
  res.redirect('/');
});

// Microsoft OAuth
router.get('/microsoft', passport.authenticate('microsoft'));
router.get('/microsoft/callback', passport.authenticate('microsoft', { failureRedirect: '/' }), (req, res) => {
  res.redirect('/');
});

// GitHub OAuth
router.get('/github', async (req: Request, res: Response) => {
  const code = req.query.code as string;

  if (!code) {
    return res.status(400).json({ error: 'Code query parameter is missing' });
  }

  try {
    // Exchange the authorization code for an access token
    const tokenResponse = await axios.post("https://github.com/login/oauth/access_token", {
      client_id: process.env.GITHUBCLIENTID,
      client_secret: process.env.GITHUBSECRET,
      code,
    }, {
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });

    const tokenData = tokenResponse.data;

    if (!tokenData.access_token) {
      return res.status(500).json({ error: 'Failed to obtain access token' });
    }

    const accessToken = tokenData.access_token;

    // Use the access token to get user details from GitHub
    const userResponse = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (userResponse.status !== 200) {
      return res.status(500).json({ error: 'Failed to get user information from GitHub' });
    }

    const userData = userResponse.data;
    return res.json(userData);

  } catch (error) {
    console.error('Error during GitHub authentication:', error);
    return res.status(500).json({ error: 'An unexpected error occurred during GitHub authentication' });
  }
});

// Manual login route
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'test@example.com' && password === 'password') {
    req.session.user = { email };
    return res.status(200).send('Login successful');
  }
  return res.status(401).send('Invalid credentials');
});

export default router;
