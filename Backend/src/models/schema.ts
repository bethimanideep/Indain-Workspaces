import mongoose from 'mongoose';

// Define Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password_hash: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const workspaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  price: { type: Number, required: true },
  facilities: { type: [String], required: true },
  geom: {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const bookingSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  booking_date: { type: Date, required: true },
  duration_hours: { type: Number, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const reviewSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  rating: { type: Number, min: 1, max: 5 },
  comment: { type: String },
  created_at: { type: Date, default: Date.now },
});

const favoriteSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  created_at: { type: Date, default: Date.now },
});

const filterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  criteria: { type: mongoose.Schema.Types.Mixed, required: true }, // Use Mixed type for JSONB equivalent
  created_at: { type: Date, default: Date.now },
});

// Export models
const User = mongoose.model('User', userSchema);
const Workspace = mongoose.model('Workspace', workspaceSchema);
const Booking = mongoose.model('Booking', bookingSchema);
const Review = mongoose.model('Review', reviewSchema);
const Favorite = mongoose.model('Favorite', favoriteSchema);
const Filter = mongoose.model('Filter', filterSchema);

export { User, Workspace, Booking, Review, Favorite, Filter };
