import { Schema, model, Types } from 'mongoose';
import { IUserDocument, UserRole, UserProfile } from '../types/user.types';


// Nested Schema for user profile
const UserProfileSchema = new Schema<UserProfile>({
    bio: {
        type: String,
        maxLength: [500, 'Bio cannot exceed 500 characters'],
        trim: true
    },
    avatar: {
        type: String,
        validate: function (v: string) {
            return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
        },
        message: 'Avatar must be a valid image url'
    },
    location: {
        type: String,
        maxLength: 100
    },
    website: {
        type: String,
        validate: function (v: string) {
            return /^https?:\/\/.+\..+/.test(v);
        },
        message: "Website must be a valid URL"
    },
    socialLinks: {
        twitter: { type: String, match: /^@?[\w]+$/ },
        linkedin: { type: String },
        github: { type: String, match: /^[\w\-]+$/ }
    }
},
{
    _id: false
})

// Main User Schema
const UserSchema = new Schema<IUserDocument>({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,      // SomeEmai@GMail.com  -> someemai@gmail.com
    trim: true,
    validate: {
      validator: function(email: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Please provide a valid email address'
    },
    index: true // Single field index for faster queries
  },
  
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],   // abc_com
    index: true
  },

  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't include in queries by default for security
  },
//  const user = await User.findOne({ email }).select('+password');

  firstName: {
    type: String,
    required: [true, 'First name is required'],
    maxlength: [50, 'First name cannot exceed 50 characters'],
    trim: true
  },

  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    maxlength: [50, 'Last name cannot exceed 50 characters'],
    trim: true
  },

  age: {
    type: Number,
    min: [13, 'Age must be at least 13'],
    max: [120, 'Age cannot exceed 120'],
    validate: {
      validator: Number.isInteger,
      message: 'Age must be an integer'
    }
  },

  roles: {
    type: [String],
    enum: {
      values: Object.values(UserRole),
      message: 'Invalid role specified'
    },
    default: [UserRole.USER]
  },

  profile: {
    type: UserProfileSchema,
    default: () => ({ socialLinks: {} })
  },

  isActive: {
    type: Boolean,
    default: true,
    index: true // For filtering active users efficiently
  },

  lastLogin: {
    type: Date,
    index: true // For analytics queries
  }

}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  versionKey: false, // Disable __v field
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete (ret as any).password; // Never send password in JSON
      return ret;
    }
  }
});


UserSchema.index({email: 1,isActive: 1});
UserSchema.index({username: 1,isActive:1});
UserSchema.index({createdAt: -1});

// Virtual property - computed filed
UserSchema.virtual('fullName').get(function(this: IUserDocument,next) {
   return `${this.firstName} ${this.lastName}`
})

// Pre-save middleware - Hash password before saving
// UserSchema.pre('save', async function(this: IUserDocument, next) {
//   // Only hash password if it's been modified (or new)
//   if (!this.isModified('password')) return next();

//   try {
//     // Hash password with cost of 12 (production strength)
//     this.password = await bcrypt.hash(this.password, 12);
//     next();
//   } catch (error) {
//     next(error as Error);
//   }
// });

// UserSchema.post()

// Instance method - Check password
// UserSchema.methods.checkPassword = async function(
//   this: IUserDocument, 
//   candidatePassword: string
// ): Promise<boolean> {
//   return bcrypt.compare(candidatePassword, this.password);
// };

// const user = await User.findOne({ email: "ayesha@example.com" }).select("+password");

// if (!user) {
//   throw new Error("User not found");
// }

// const isMatch = await user.checkPassword("mySecret123");

// if (isMatch) {
//   console.log("✅ Login successful!");
// } else {
//   console.log("❌ Invalid password");
// }

UserSchema.statics.findActive = function () {
    return this.find({isActive: true})
}

export const User = model<IUserDocument>('User', UserSchema);