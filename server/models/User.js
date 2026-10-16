import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address'
      ]
    },
    password: {
      type: String,
      required: [
        function () {
          return this.authProvider === 'local' || !this.googleId;
        },
        'Password is required'
      ],
      minlength: [6, 'Password must be at least 6 characters long']
    },
    role: {
      type: String,
      enum: {
        values: ['user', 'admin'],
        message: '{VALUE} is not a valid role'
      },
      default: 'user'
    },
    authProvider: {
      type: String,
      enum: {
        values: ['local', 'google'],
        message: '{VALUE} is not a valid auth provider'
      },
      default: 'local'
    },
    googleId: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
      required: [
        function () {
          return this.authProvider === 'google';
        },
        'Google ID is required for Google authentication'
      ]
    },
    avatar: {
      type: String,
      trim: true,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model('User', userSchema);

export default User;
