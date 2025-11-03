import { Types } from 'mongoose';
import { User } from '../models/User';
import { IUserInput, IUserDocument } from '../types/user.types';

export class UserService {
    public async createUser(userData: IUserInput): Promise<IUserDocument> {
        try {
            const existingUser = await User.findOne({
                $or: [
                    {
                        email: userData.email
                    },
                    {
                        userName: userData.username
                    }
                ]
            })
            if (existingUser) {
                throw new Error(
                    existingUser.email === userData.email
                        ? 'Email already registered'
                        : 'Username already taken'
                );
            }
            // create new user
            const user = new User(userData);
            await user.save();
            console.log(`User created: ${user.email} (ID: ${user._id})`);
            return user;
        } catch (error) {
            if (error instanceof Error) {
                // Handle Mongoose validation errors
                if (error.name === 'ValidationError') {
                    throw new Error(`Validation failed: ${error.message}`);
                }
                throw error;
            }
            throw new Error('Failed to create user');
        }
    }

    // REad user by email (common user case)
    public async getUserByEmail(email: string): Promise<IUserDocument | null> {
        try {
            return await User.findOne({
                email: email.toLowerCase(),
                isActive: true
            }).exec();
        } catch (error) {
            console.error(`Error fetching user by email ${email}:`, error);
            throw error;
        }
    }

    // Get users with pagination and filtering
    public async getUsers(options: {
        page?: number;
        limit?: number;
        role?: string;
        isActive?: boolean;
        search?: string;
    } = {}): Promise<{
        users: IUserDocument[];
        totalCount: number;
        currentPage: number;
        totalPages: number;
    }> {
        try {
            const {
                page = 1,
                limit = 10,
                role,
                isActive = true,
                search
            } = options;

            // Build query object
            const query: any = { isActive };

            if (role) {
                query.roles = role;
            }

            if (search) {
                query.$or = [
                    { firstName: { $regex: search, $options: 'i' } },
                    { lastName: { $regex: search, $options: 'i' } },
                    { username: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ];
            }


            // Calculate skip value
            const skip = (page - 1) * limit;


            // Execute query with pagination
            const [users, totalCount] = await Promise.all([
                User.find(query)
                    .select('-password') // Exclude password
                    .sort({ createdAt: -1 }) // Latest first
                    .skip(skip)
                    .limit(limit)
                    .exec(),
                User.countDocuments(query)
            ]);

            return {
                users,
                totalCount,
                currentPage: page,
                totalPages: Math.ceil(totalCount / limit)
            };

        } catch (error) {
            console.error('Error fetching users:', error);
            throw error;
        }
    }
    // Update user with validation
    public async updateUser(
        userId: string,
        updateData: Partial<IUserInput>
    ): Promise<IUserDocument | null> {
        try {
            if (!Types.ObjectId.isValid(userId)) {
                throw new Error('Invalid user ID format');
            }

            // Remove fields that shouldn't be updated directly
            const { password, ...safeUpdateData } = updateData;

            const user = await User.findByIdAndUpdate(
                userId,
                {
                    ...safeUpdateData,
                    updatedAt: new Date() // Manual timestamp update if needed
                },
                {
                    new: true, // Return updated document
                    runValidators: true // Run schema validation
                }
            ).exec();

            if (!user) {
                throw new Error('User not found');
            }

            console.log(`User updated: ${user.email} (ID: ${user._id})`);
            return user;

        } catch (error) {
            console.error(`Error updating user ${userId}:`, error);
            throw error;
        }
    }
    // Soft delete user (set isActive to false)
    public async softDeleteUser(userId: string): Promise<boolean> {
        try {
            if (!Types.ObjectId.isValid(userId)) {
                throw new Error('Invalid user ID format');
            }

            const result = await User.findByIdAndUpdate(
                userId,
                {
                    isActive: false,
                    updatedAt: new Date()
                }
            ).exec();

            if (!result) {
                throw new Error('User not found');
            }

            console.log(`User soft deleted: ${result.email} (ID: ${result._id})`);
            return true;

        } catch (error) {
            console.error(`Error soft deleting user ${userId}:`, error);
            throw error;
        }
    }
    // Hard delete user (permanent removal)
    public async hardDeleteUser(userId: string): Promise<boolean> {
        try {
            if (!Types.ObjectId.isValid(userId)) {
                throw new Error('Invalid user ID format');
            }

            const result = await User.findByIdAndDelete(userId).exec();

            if (!result) {
                throw new Error('User not found');
            }

            console.log(`User permanently deleted: ${result.email} (ID: ${result._id})`);
            return true;

        } catch (error) {
            console.error(`Error hard deleting user ${userId}:`, error);
            throw error;
        }
    }
    // Update last login timestamp
    public async updateLastLogin(userId: string): Promise<void> {
        try {
            await User.findByIdAndUpdate(
                userId,
                { lastLogin: new Date() }
            ).exec();
        } catch (error) {
            console.error(`Error updating last login for user ${userId}:`, error);
            throw error;
        }
    }
}