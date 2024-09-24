import { Router } from 'express';
import passport from '../config/passport';
import axios from 'axios';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ManualLoginUser, User } from '../models/schema';
import tls from 'tls';
import { Buffer } from 'buffer';
import crypto from 'crypto';

const USERNAME = 'courseplacement55@gmail.com';
const PASSWORD = 'cpojxcunsldhwlts';

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
    const userEmail = userProfile.emails[0].value; // Accessing user's email
    const username = userProfile.displayName;  
        // Accessing user's name (can vary based on Google's response)
    
    // Check if the user already exists in MongoDB
    let user = await User.findOne({ email: userEmail });
    console.log(user);
    
    if (!user) {
      // If user does not exist, create a new user
      user = new User({
        username: username,
        email: userEmail,
        authenticationType: 'google',
        verified: true // Set authentication type as Google
      });
      await user.save();
    }
    
    // Generate JWT token
    const token = jwt.sign({ email: userEmail }, process.env.JWT_SECRET!, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ email: userEmail }, process.env.JWT_SECRET!, { expiresIn: '7d' });
  
    // Set tokens in cookies
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,       // Use HTTPS in production
      sameSite: 'none',   // For cross-domain requests
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,       // Use HTTPS in production
      sameSite: 'none',   // For cross-domain requests
    });
    
    // Redirect to your frontend or another desired route
    res.redirect('http://127.0.0.1:5500/'); // Change this to the frontend URL or another route
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
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
    const userEmail = userData.email; // Get user email from GitHub response
    const username = userData.login;  // Get username from GitHub response
    

    // Check if the user already exists in MongoDB
    let user = await User.findOne({ email: userEmail });
    console.log(user);

    if (!user) {
      // If user does not exist, create a new user with authenticationType as 'github'
      user = new User({
        username: username,
        email: userEmail,
        authenticationType: 'github',
        verified: true // Set authentication type as GitHub
      });
      await user.save(); // Save the new user to the database
    } else {
      // Update the authentication type if needed
      user.authenticationType = 'github';
      await user.save();
    }

    // Generate JWT token
    const token = jwt.sign({ email: userEmail }, process.env.JWT_SECRET!, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ email: userEmail }, process.env.JWT_SECRET!, { expiresIn: '7d' });

    // Set tokens in cookies
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,       // Use HTTPS in production
      sameSite: 'none',   // For cross-domain requests
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,       // Use HTTPS in production
      sameSite: 'none',   // For cross-domain requests
    });

    // Redirect to your frontend or desired route
    res.redirect('http://127.0.0.1:5500/'); // Change this to the frontend URL or another route


  } catch (error) {
    console.error('Error during GitHub authentication:', error);
    return res.status(500).json({ error: 'An unexpected error occurred during GitHub authentication' });
  }
});


// Manual login route
function sendEmail(recipientEmail: string, otp: string) {
  return new Promise((resolve, reject) => {
    const client = tls.connect(
      {
        host: 'smtp.gmail.com', // This should be in the options object
        port: 465, // Port should be specified here
      },
      () => {
        console.log('TLS connection established');
      }
    );
    client.write(
      'EHLO localhost\r\n' +
        `AUTH PLAIN ${Buffer.from(`\0${USERNAME}\0${PASSWORD}`).toString(
          'base64'
        )}\r\n`
    );

    client.on('data', (data) => {
      const response = data.toString();

      if (response.includes('235')) {
        // Authentication successful, send the email
        client.write(
          `MAIL FROM:<${USERNAME}>\r\nRCPT TO:<${recipientEmail}>\r\nDATA\r\n`
        );
        client.write(
          `From: ${USERNAME}\r\n` +
            `To: ${recipientEmail}\r\n` +
            `Subject: Your OTP Code\r\n` +
            `\r\n` + // Blank line to separate headers from body
            `Your OTP code is: ${otp}\r\n` +
            `.\r\n` // End of data
        );
      } else if (response.includes('250 2.0.0 OK')) {
        // Email sent successfully
        client.end();
        console.log("Email sent successfully");
        resolve('Email sent successfully');
      }
    });

    client.on('error', (err) => {
      reject(err);
    });

    client.on('end', () => {
      console.log("SMTP connection closed");
      
      resolve('SMTP connection closed');
    });
  });
}

router.post('/login', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Check if the manual login user exists
    let user = await ManualLoginUser.findOne({ email });

    // If user does not exist, create a new one
    if (!user) {
      user = new ManualLoginUser({
        email,
        verified: false, // Initially unverified
      });
    } else {
      // If user exists, reset OTP-related fields
      user.otp = undefined;           // Clear previous OTP
      user.otpExpiresAt = undefined;  // Clear previous OTP expiration time
      user.verified = false;          // Ensure user is marked as unverified
    }

    // Generate a random OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Set OTP expiration time (e.g., 10 minutes)
    const otpExpiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes from now

    // Update user with OTP and expiration time
    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    // Send the OTP to the user's email using custom SMTP code
    await sendEmail(email, otp);

    res.status(200).json({ message: 'OTP sent to your email' });
  } catch (error) {
    console.error('Error in /login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  try {
    // Find the user by email in ManualLoginUser schema
    const user = await ManualLoginUser.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Check if OTP matches and is not expired
    if (user.otp === otp && user.otpExpiresAt && user.otpExpiresAt > new Date()) {
      // Update manualLoginOTP to true and clear OTP fields
      user.verified = true; // Mark user as verified
      user.otp = undefined;
      user.otpExpiresAt = undefined;
      await user.save();

      res.status(200).json({ message: 'OTP verified, login successful' });
    } else {
      res.status(400).json({ error: 'Invalid or expired OTP' });
    }
  } catch (error) {
    console.error('Error in /verify-otp:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


export default router;
