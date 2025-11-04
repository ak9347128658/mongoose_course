// src/models/Post.ts
import { Schema, model, Types } from 'mongoose';
import { IPostDocument, PostStatus, SEOData } from '../types/blog.types';

// Embedded SEO schema
const SEODataSchema = new Schema<SEOData>({
  metaTitle: {
    type: String,
    maxlength: [60, 'Meta title should not exceed 60 characters']
  },
  metaDescription: {
    type: String,
    maxlength: [160, 'Meta description should not exceed 160 characters']
  },
  keywords: {
    type: [String],
    validate: {
      validator: function(keywords: string[]) {
        return keywords.length <= 10;
      },
      message: 'Cannot have more than 10 keywords'
    }
  },
  canonicalUrl: {
    type: String,
    validate: {
      validator: function(url: string) {
        return /^https?:\/\/.+/.test(url);
      },
      message: 'Canonical URL must be a valid URL'
    }
  }
}, { _id: false });

const PostSchema = new Schema<IPostDocument>({
  title: {
    type: String,
    required: [true, 'Post title is required'],
    maxlength: [200, 'Title cannot exceed 200 characters'],
    trim: true,
    index: 'text' // Text index for search
  },

  slug: {
    type: String,
    required: [true, 'Post slug is required'],
    unique: true,
    lowercase: true,
    validate: {
      validator: function(slug: string) {
        return /^[a-z0-9-]+$/.test(slug);
      },
      message: 'Slug can only contain lowercase letters, numbers, and hyphens'
    },
    index: true
  },

  content: {
    type: String,
    required: [true, 'Post content is required'],
    index: 'text' // Enable full-text search
  },

  excerpt: {
    type: String,
    maxlength: [300, 'Excerpt cannot exceed 300 characters'],
    trim: true
  },

  author: {
    type: Schema.Types.ObjectId,
    ref: 'User', // Reference to User model
    required: [true, 'Post author is required'],
    index: true
  },

  categories: {
    type: [String],
    validate: {
      validator: function(categories: string[]) {
        return categories.length > 0 && categories.length <= 5;
      },
      message: 'Post must have 1-5 categories'
    },
    index: true
  },

  tags: {
    type: [String],
    validate: {
      validator: function(tags: string[]) {
        return tags.length <= 10;
      },
      message: 'Cannot have more than 10 tags'
    }
  },

  featuredImage: {
    type: String,
    validate: {
      validator: function(url: string) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(url);
      },
      message: 'Featured image must be a valid image URL'
    }
  },

  status: {
    type: String,
    enum: {
      values: Object.values(PostStatus),
      message: 'Invalid post status'
    },
    default: PostStatus.DRAFT,
    index: true
  },

  publishedAt: {
    type: Date,
    index: true
  },

  readTime: {
    type: Number,
    min: 1,
    default: 1
  },

  views: {
    type: Number,
    default: 0,
    min: 0,
    index: true // For popular posts queries
  },

  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],

seoData: {
    type: SEODataSchema,
    default: () => ({ keywords: [] })
  }


}, {
  timestamps: true,
  toJSON: { virtuals: true },  toObject: { virtuals: true }
});

// Compound indexes for common query patterns
PostSchema.index({ status: 1, publishedAt: -1 }); // Published posts by date
PostSchema.index({ author: 1, status: 1 }); // Author's posts by status
PostSchema.index({ categories: 1, status: 1, publishedAt: -1 }); // Category posts
PostSchema.index({ tags: 1, status: 1 }); // Tag queries
PostSchema.index({ 
  title: 'text', 
  content: 'text', 
  excerpt: 'text' 
}, {
  weights: {
    title: 10,
    excerpt: 5,
    content: 1
  }
}); // Full-text search with weights

// Post.find({ $text: { $search: "mongodb performance" } });


// Virtual for like count
PostSchema.virtual('likesCount').get(function(this: IPostDocument) {
  return this.likes?.length || 0;
});

// Virtual for reading time in human format
PostSchema.virtual('readTimeText').get(function(this: IPostDocument) {
  return `${this.readTime} min read`;
});

// Instance method to generate slug from title
PostSchema.methods.generateSlug = function(this: IPostDocument): string {
  return this.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
};

// title: "Learn MongoDB in 2025!!"
// slug: "learn-mongodb-in-2025"
// https://myblog.com/learn-mongodb-in-2025

// Instance method to calculate read time
PostSchema.methods.calculateReadTime = function(this: IPostDocument): number {
  const wordsPerMinute = 200;
  const wordCount = this.content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute) || 1;
};
// 450 words → 450 / 200 = 2.25 → 3 min read

// Instance method to check if published
PostSchema.methods.isPublished = function(this: IPostDocument): boolean {
  return this.status === PostStatus.PUBLISHED && 
         this.publishedAt != null && 
         this.publishedAt <= new Date();
};
// {
//   status: "published",
//   publishedAt: "2025-11-04T10:00:00Z"
// }


// Pre-save middleware
PostSchema.pre('save', function(this: IPostDocument, next) {
  // Auto-generate slug if not provided
  if (!this.slug && this.title) {
    this.slug = this.generateSlug();
  }

  // Calculate read time
  if (this.isModified('content')) {
    this.readTime = this.calculateReadTime();
  }

  // Set published date when status changes to published
  if (this.isModified('status') && this.status === PostStatus.PUBLISHED && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  // Auto-generate excerpt if not provided
  if (!this.excerpt && this.content) {
    this.excerpt = this.content
      .replace(/(<([^>]+)>)/gi, '') // Remove HTML tags
      .substring(0, 150)
      .trim() + '...';
  }
// "<p>MongoDB is a NoSQL database...</p>"
// "MongoDB is a NoSQL database..."

  next();
});

export const Post = model<IPostDocument>('Post', PostSchema);