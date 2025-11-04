import { Post } from "../models/Post";
import { PostStatus } from "../types/blog.types";

// src/services/AnalyticsService.ts
export class AnalyticsService {

  // Basic aggregation: Group and count
  public async getPostStatsByCategory(): Promise<any[]> {
    return await Post.aggregate([
      // Stage 1: Match published posts only
      {
        $match: {
          status: PostStatus.PUBLISHED
        }
      },
      // Stage 2: Unwind categories array
      {
        $unwind: '$categories'
      },
      // Stage 3: Group by category and calculate stats
      {
        $group: {
          _id: '$categories',
          postCount: { $sum: 1 },
          totalViews: { $sum: '$views' },
          avgViews: { $avg: '$views' },
          maxViews: { $max: '$views' },
          latestPost: { $max: '$publishedAt' }
        }
      },
      // Stage 4: Sort by post count
      {
        $sort: { postCount: -1 }
      }
    ]).exec();
  }

  // Advanced aggregation with lookups
  public async getAuthorStatistics(): Promise<any[]> {
    return await Post.aggregate([
      {
        $match: {
          status: PostStatus.PUBLISHED
        }
      },
      {
        $group: {
          _id: '$author',
          postCount: { $sum: 1 },
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: { $size: '$likes' } },
          avgViews: { $avg: '$views' },
          firstPost: { $min: '$publishedAt' },
          latestPost: { $max: '$publishedAt' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'authorInfo'
        }
      },
      {
        $unwind: '$authorInfo'
      },
      {
        $project: {
          author: {
            username: '$authorInfo.username',
            fullName: {
              $concat: ['$authorInfo.firstName', ' ', '$authorInfo.lastName']
            }
          },
          postCount: 1,
          totalViews: 1,
          totalLikes: 1,
          avgViews: { $round: ['$avgViews', 2] },
          daysSinceFirstPost: {
            $divide: [
              { $subtract: [new Date(), '$firstPost'] },
              1000 * 60 * 60 * 24
            ]
          },
          engagement: {
            $divide: ['$totalLikes', '$totalViews']
          }
        }
      },
      {
        $sort: { totalViews: -1 }
      }
    ]).exec();
  }
}