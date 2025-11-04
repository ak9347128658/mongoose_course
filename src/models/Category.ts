// src/models/Category.ts
import { Schema, model } from 'mongoose';
import { ICategoryDocument } from '../types/blog.types';

const CategorySchema = new Schema<ICategoryDocument>({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    maxlength: [50, 'Category name cannot exceed 50 characters'],
    trim: true
  },

  slug: {
    type: String,
    required: [true, 'Category slug is required'],
    unique: true,
    lowercase: true,
    index: true
  },

  description: {
    type: String,
    maxlength: [200, 'Description cannot exceed 200 characters'],
    trim: true
  },

  color: {
    type: String,
    required: [true, 'Category color is required'],
    validate: {
      validator: function(color: string) {
        return /^#[0-9A-F]{6}$/i.test(color);
      },
      message: 'Color must be a valid hex color code'
    }
  },

  postCount: {
    type: Number,
    default: 0,
    min: 0
  },

  parentCategory: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
    index: true
  },
// Programming
//  ├── JavaScript
//  ├── Python
//  └── Java

  isActive: {
    type: Boolean,
    default: true,
    index: true
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true }
});

// Virtual for subcategories
CategorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentCategory'
});

// {
//   name: "Programming",
//   subcategories: [
//     { name: "JavaScript" },
//     { name: "Python" },
//     { name: "C++" }
//   ]
// }

export const Category = model<ICategoryDocument>('Category', CategorySchema);