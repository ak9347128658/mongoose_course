import { Types } from 'mongoose';
import { Post } from '../models/Post';
import { IPostDocument, PostStatus } from '../types/blog.types';
import { Comment } from '../models/Comment';
import { User } from '../models/User';

// src/services/SearchService.ts
export class SearchService {

  // Full-text search with advanced filtering
  public async searchPosts(query: {
    text?: string;
    categories?: string[];
    tags?: string[];
    author?: string;
    dateRange?: {
      start: Date;
      end: Date;
    };
    minViews?: number;
    hasImage?: boolean;
  }): Promise<IPostDocument[]> {
    try {
      const searchQuery: any = {
        status: PostStatus.PUBLISHED
      };

      // Text search using $text operator
      if (query.text) {
        searchQuery.$text = {
          $search: query.text,
          $caseSensitive: false
        };
      }
// { $text: { $search: "mongodb mongoose" } }

      // Array field queries using $in
      if (query.categories && query.categories.length > 0) {
        searchQuery.categories = { $in: query.categories };
      }
// { categories: { $in: ["Technology", "Database"] } }

      if (query.tags && query.tags.length > 0) {
        searchQuery.tags = { $in: query.tags };
      }

      // Author search using $regex for partial matching
      if (query.author) {
        searchQuery.author = await this.findAuthorsByName(query.author);
      }

      // Date range using $gte and $lte
      if (query.dateRange) {
        searchQuery.publishedAt = {
          $gte: query.dateRange.start,
          $lte: query.dateRange.end
        };
      }

      // Numeric comparisons
      if (query.minViews) {
        searchQuery.views = { $gte: query.minViews };
      }

      // Existence checks
      if (query.hasImage !== undefined) {
        searchQuery.featuredImage = query.hasImage 
          ? { $exists: true, $ne: null }
          : { $exists: false };
      }

      let sortOptions: any = { publishedAt: -1 };
      
      if (query.text) {
        sortOptions = {
          score: { $meta: 'textScore' },
          publishedAt: -1
        };
      }

      const posts = await Post.find(searchQuery)
        .populate('author', 'username firstName lastName')
        .select('-content')
        .sort(sortOptions)
        .limit(50)
        .exec();

      return posts;

    } catch (error) {
      console.error('Error searching posts:', error);
      throw error;
    }
  }

  // Complex $or queries
  public async findSimilarPosts(
    postId: string,
    limit: number = 5
  ): Promise<IPostDocument[]> {
    try {
      const post = await Post.findById(postId).select('categories tags');
      if (!post) return [];

      const similarPosts = await Post.find({
        _id: { $ne: postId }, // Exclude current post
        status: PostStatus.PUBLISHED,
        $or: [
          { categories: { $in: post.categories } },
          { tags: { $in: post.tags } }
        ]
      })
      .populate('author', 'username firstName lastName')
      .select('title slug excerpt author publishedAt views likesCount')
      .sort({ publishedAt: -1 })
      .limit(limit)
      .exec();

      return similarPosts;

    } catch (error) {
      console.error(`Error finding similar posts for ${postId}:`, error);
      throw error;
    }
  }

  // Advanced aggregation for analytics
  public async getPopularPostsThisWeek(): Promise<any[]> {
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      return await Post.aggregate([
        {
          $match: {
            status: PostStatus.PUBLISHED,
            publishedAt: { $gte: weekAgo }
          }
        },
        {
          $addFields: {
            likesCount: { $size: '$likes' }
          }
        },
        {
          $project: {
            title: 1,
            slug: 1,
            author: 1,
            views: 1,
            likesCount: 1,
            publishedAt: 1,
            // Calculate engagement score
            engagementScore: {
              $add: [
                { $multiply: ['$views', 1] },
                { $multiply: ['$likesCount', 5] }
              ]
            }
          }
        },
        {
          $sort: { engagementScore: -1 }
        },
        {
          $limit: 10
        },
        {
          $lookup: {
            from: 'users',
            localField: 'author',
            foreignField: '_id',
            as: 'author',
            pipeline: [
              { $project: { username: 1, firstName: 1, lastName: 1 } }
            ]
          }
        },
        {
          $unwind: '$author'
        }
      ]).exec();

    } catch (error) {
      console.error('Error getting popular posts:', error);
      throw error;
    }
  }

  // Helper method for author search
  private async findAuthorsByName(name: string): Promise<Types.ObjectId[]> {
    const authors = await User.find({
      $or: [
        { firstName: { $regex: name, $options: 'i' } },
        { lastName: { $regex: name, $options: 'i' } },
        { username: { $regex: name, $options: 'i' } }
      ]
    }).select('_id').exec();

    return authors.map(author => author._id);
  }

  // Array element matching with $elemMatch
  public async findPostsWithApprovedComments(): Promise<IPostDocument[]> {
    try {
      // First get posts that have approved comments
      const postsWithComments = await Comment.distinct('post', {
        isApproved: true
      });

      return await Post.find({
        _id: { $in: postsWithComments },
        status: PostStatus.PUBLISHED
      })
      .populate('author', 'username firstName lastName')
      .select('title slug author publishedAt views')
      .sort({ publishedAt: -1 })
      .exec();

    } catch (error) {
      console.error('Error finding posts with approved comments:', error);
      throw error;
    }
  }
}

// [
//   {
//     title: "Mongoose 101",
//     slug: "mongoose-101",
//     author: { username: "asif", firstName: "Asif", lastName: "Khan" },
//     publishedAt: "2025-11-01T10:00:00Z",
//     views: 1500
//   },
//   {
//     title: "MongoDB Tips",
//     slug: "mongodb-tips",
//     author: { username: "john", firstName: "John", lastName: "Doe" },
//     publishedAt: "2025-10-28T09:00:00Z",
//     views: 1200
//   }
// ]
