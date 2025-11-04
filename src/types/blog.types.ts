// src/types/blog.types.ts
import { Document, Types } from 'mongoose';

// Post Types
export interface IPost {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  author: Types.ObjectId; // Reference to User
  categories: string[];
  tags: string[];
  featuredImage?: string;
  status: PostStatus;
  publishedAt?: Date;
  readTime: number; // Calculated field
  views: number;
  likes: Types.ObjectId[]; // Array of User IDs who liked
  seoData: SEOData; // Embedded document
  createdAt: Date;
  updatedAt: Date;
}

export interface IPostDocument extends IPost, Document {
  _id: Types.ObjectId;
  generateSlug(): string;
  calculateReadTime(): number;
  isPublished(): boolean;
}

export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export interface SEOData {
  metaTitle?: string;
  metaDescription?: string;
  keywords: string[];
  canonicalUrl?: string;
}

// Comment Types - Nested subdocuments for better performance
export interface IComment {
  author: Types.ObjectId; // Reference to User
  content: string;
  parentComment?: Types.ObjectId; // For nested replies
  isApproved: boolean;
  likes: number;
  createdAt: Date;
  updatedAt: Date;
  post: Types.ObjectId; // Reference to Post
}

export interface ICommentDocument extends IComment, Document {
  _id: Types.ObjectId;
}

// Category Types - Separate collection for better organization
export interface ICategory {
  name: string;
  slug: string;
  description?: string;
  color: string; // Hex color for UI
  postCount: number; // Denormalized for performance
  parentCategory?: Types.ObjectId; // For hierarchical categories
  isActive: boolean;
  createdAt: Date;
}

export interface ICategoryDocument extends ICategory, Document {
  _id: Types.ObjectId;
}