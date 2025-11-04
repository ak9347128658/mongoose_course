import { Types } from "mongoose";
import { Comment } from "../models/Comment";
import { Post } from "../models/Post";
import { ICommentDocument, IPostDocument, IPostInput, PostStatus } from "../types/blog.types";
import { AnalyticsService } from "./AnalyticsService";
import { PostService } from "./PostService";
import { SearchService } from "./SearchService";

// src/services/BlogService.ts
export class BlogService {
  constructor(
    private postService: PostService,
    private searchService: SearchService,
    private analyticsService: AnalyticsService
  ) {}

  // Create post with auto-generated fields
  public async createPost(postData: IPostInput, authorId: string): Promise<IPostDocument> {
    const post = new Post({
      ...postData,
      author: authorId,
      slug: postData.slug || this.generateSlugFromTitle(postData.title)
    });
    
    return await post.save();
  }

  // Publish post (change from draft to published)
  public async publishPost(postId: string): Promise<IPostDocument> {
    const post = await Post.findByIdAndUpdate(
      postId,
      {
        status: PostStatus.PUBLISHED,
        publishedAt: new Date()
      },
      { new: true }
    ).exec();
    
    if (!post) {
      throw new Error(`Post with id ${postId} not found`);
    }
    
    return post;
  }

  // Add comment with auto-approval logic
  public async addComment(commentData: {
    postId: string;
    authorId: string;
    content: string;
    parentCommentId?: string;
  }): Promise<ICommentDocument> {
    // Check if user is trusted (has approved comments before)
    const previousApprovedComments = await Comment.countDocuments({
      author: commentData.authorId,
      isApproved: true
    });

    const comment = new Comment({
      post: commentData.postId,
      author: commentData.authorId,
      content: commentData.content,
      parentComment: commentData.parentCommentId,
      isApproved: previousApprovedComments > 5 // Auto-approve trusted users
    });

    return await comment.save();
  }

  // Dashboard method combining multiple analytics
  public async getDashboardStats(authorId?: string): Promise<any> {
    const [
      categoryStats,
      authorStats,
      popularPosts,
      recentActivity
    ] = await Promise.all([
      this.analyticsService.getPostStatsByCategory(),
      this.analyticsService.getAuthorStatistics(),
      this.searchService.getPopularPostsThisWeek(),
      this.getRecentActivity(authorId)
    ]);

    return {
      categoryStats,
      authorStats,
      popularPosts,
      recentActivity
    };
  }

  private async getRecentActivity(authorId?: string): Promise<any[]> {
    const matchStage = authorId ? { author: new Types.ObjectId(authorId) } : {};
    
    return await Post.aggregate([
      { $match: matchStage },
      { $sort: { updatedAt: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'author'
        }
      },
      { $unwind: '$author' },
      {
        $project: {
          title: 1,
          status: 1,
          updatedAt: 1,
          'author.username': 1
        }
      }
    ]).exec();
  }

  private generateSlugFromTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .trim(); // Remove leading/trailing whitespace
  }
}

// ┌────────────┐
// │   User     │
// │ _id        │
// │ username   │
// └────┬───────┘
//      │  (author)
//      ▼
// ┌───────────────┐
// │     Post       │
// │ title, content │
// │ author, tags   │
// │ categories[]   │
// │ seoData{}      │
// └────┬───────────┘
//      │ (1 Post can have many)
//      ▼
// ┌──────────────┐
// │   Comment     │
// │ content, likes│
// │ parentComment │
// │ post          │
// └───────────────┘

// ┌──────────────┐
// │  Category     │
// │ name, color   │
// │ parentCategory│
// └───────────────┘
