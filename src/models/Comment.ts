// src/models/Comment.ts
import { Schema, model } from 'mongoose';
import { ICommentDocument } from '../types/blog.types';

const CommentSchema = new Schema<ICommentDocument>({
  post: {
    type: Schema.Types.ObjectId,
    ref: 'Post',
    required: [true, 'Comment must belong to a post'],
    index: true
  },

  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Comment must have an author'],
    index: true
  },

  content: {
    type: String,
    required: [true, 'Comment content is required'],
    maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    trim: true
  },

  parentComment: {
    type: Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
    index: true
  },

  isApproved: {
    type: Boolean,
    default: false,
    index: true
  },

  likes: {
    type: Number,
    default: 0,
    min: 0
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true }
});

// Compound indexes for efficient queries
CommentSchema.index({ post: 1, isApproved: 1, createdAt: -1 });
CommentSchema.index({ author: 1, createdAt: -1 });
CommentSchema.index({ parentComment: 1, isApproved: 1 });

// Virtual for nested replies
CommentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentComment'
});

export const Comment = model<ICommentDocument>('Comment', CommentSchema);