import { Document, Types } from "mongoose";

export interface IUser {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  age?: number;
  password: string;
  roles: UserRole[];
  profile: UserProfile;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;    
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator'
}

export interface UserProfile {
  bio?: string;
  avatar?: string;
  location?: string;
  website?: string;
  socialLinks: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
}

export interface IUserDocument extends IUser, Document {
  _id: Types.ObjectId;
  fullName: string;
  checkPassword(password: string): Promise<boolean>; // instance method
}

// for creating new users
export interface IUserInput {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  age?: number;
  roles?: UserRole[];
}