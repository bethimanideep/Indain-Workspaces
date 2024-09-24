import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import session from 'express-session';
import cors from 'cors';
import passport from './config/passport';  // Import passport from the config
import authRoutes from './routes/auth';    // Import the auth routes
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser'

declare module 'express-session' {
  interface SessionData {
    user: any; // Define a more specific type if needed
  }
}

// Express app setup
const app = express();
app.use(cors({
  origin: 'http://127.0.0.1:5500', // Update to your frontend's origin
  credentials: true,
}));
app.use(cookieParser()); 
app.use(express.json());
app.use(session({ secret: `${process.env.JWT_SECRET}`, resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// Socket.IO setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
      origin: "*",
  }
});

// Use authentication routes
app.use('/auth', authRoutes);

// Welcome route
app.get('/', (req, res) => {
  const token = jwt.sign({ email: "mani" }, process.env.JWT_SECRET!, { expiresIn: '1h' });
  const refreshToken = jwt.sign({ email: "mani" }, process.env.JWT_SECRET!, { expiresIn: '7d' });

  // Set tokens in cookies
  res.cookie('token', token); // Set secure to true in production
  res.cookie('refreshToken', refreshToken); // Set secure to true in production
  
  res.send("user data added to cookie")
});
app.get('/c', (req, res) => {
  console.log(req.cookies);
  
  res.send(req.cookies); 
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('A user connected');
  
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Start server
server.listen(process.env.PORT || 8080, async () => {
  try {
    console.log(`Server is running on http://localhost:${process.env.PORT || 8080}`);
    await mongoose.connect(`${process.env.MONGO_URI}`);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
});

// Properly handle process exit
process.on('SIGINT', async () => {
  console.log('Received SIGINT. Cleaning up...');
  await mongoose.disconnect(); // Close MongoDB connection
  console.log('Database connection closed');
  process.exit(0);
});
