// src/services/PostService.ts
import { Types, FilterQuery } from 'mongoose';
import { Post } from '../models/Post';
import { Comment } from '../models/Comment';
import { IPostDocument, PostStatus } from '../types/blog.types';

export class PostService {

  // Get post with full population
  public async getPostBySlug(slug: string): Promise<IPostDocument | null> {
    try {
      const post = await Post.findOne({ 
        slug, 
        status: PostStatus.PUBLISHED 
      })
      .populate({
        path: 'author',
        select: 'username firstName lastName profile.avatar', // Only needed fields
        match: { isActive: true } // Population filter
      })
      .populate({
        path: 'likes',
        select: 'username',
        options: { limit: 10 } // Limit populated likes
      })
      .exec();

      if (post) {
        // Increment view count atomically
        await Post.findByIdAndUpdate(
          post._id,
          { $inc: { views: 1 } }
        );
      }

      return post;
    } catch (error) {
      console.error(`Error fetching post by slug ${slug}:`, error);
      throw error;
    }
  }

  // Get posts with comments populated
  public async getPostWithComments(postId: string): Promise<{
    post: IPostDocument | null;
    comments: any[];
  }> {
    try {
      if (!Types.ObjectId.isValid(postId)) {
        throw new Error('Invalid post ID');
      }

      // Get post
      const post = await Post.findById(postId)
        .populate('author', 'username firstName lastName profile.avatar')
        .exec();

      if (!post) {
        return { post: null, comments: [] };
      }

      // Get comments with nested replies
      const comments = await Comment.find({
        post: postId,
        isApproved: true,
        parentComment: null // Top-level comments only
      })
      .populate('author', 'username profile.avatar')
      .populate({
        path: 'replies',
        match: { isApproved: true },
        populate: {
          path: 'author',
          select: 'username profile.avatar'
        },
        options: { 
          sort: { createdAt: 1 },
          limit: 50 // Limit replies per comment
        }
      })
      .sort({ createdAt: -1 })
      .limit(50) // Limit top-level comments
      .exec();

      return { post, comments };
    } catch (error) {
      console.error(`Error fetching post with comments ${postId}:`, error);
      throw error;
    }
  }

  // Advanced filtering and population
  public async getPostsByCategory(
    category: string,
    options: {
      page?: number;
      limit?: number;
      sortBy?: 'createdAt' | 'views' | 'likes';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    posts: IPostDocument[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const query: FilterQuery<IPostDocument> = {
        categories: category,
        status: PostStatus.PUBLISHED,
        publishedAt: { $lte: new Date() }
      };
// Post.find(query)

      const sortOptions: any = {};
      if (sortBy === 'likes') {
        sortOptions.likesCount = sortOrder === 'desc' ? -1 : 1;
      } else {
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
      }

      const skip = (page - 1) * limit;

      const [posts, totalCount] = await Promise.all([
        Post.find(query)
          .populate('author', 'username firstName lastName')
          .select('-content') // Exclude full content for list view
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .exec(),
        Post.countDocuments(query)
      ]);

      return {
        posts,
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit)
      };

    } catch (error) {
      console.error(`Error fetching posts by category ${category}:`, error);
      throw error;
    }
  }
}