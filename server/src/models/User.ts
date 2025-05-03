import mongoose, { Document, Model } from 'mongoose';
import bcrypt from 'bcrypt';

// Interface for User methods
interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// User interface for the document
export interface IUser extends Document {
  username: string;
  password: string;
  avatarColor: string;
  createdAt: Date;
}

// Combined User type with methods
export type UserDocument = IUser & IUserMethods;

// Define the user schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  avatarColor: {
    type: String,
    default: () => {
      // Generate a random color for user avatar
      const colors = ['#FF5733', '#33FF57', '#3357FF', '#F033FF', '#FF33A8', '#33FFF5', '#FFF533'];
      return colors[Math.floor(Math.random() * colors.length)];
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  // Include virtuals when converting document to JSON
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password; // Remove password from the JSON result
      delete ret.__v;
      return ret;
    }
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it's modified (or new)
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Create the User model
const User = mongoose.model<UserDocument>('User', userSchema);

export default User; 