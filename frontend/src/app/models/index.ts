// src/app/models/index.ts

export interface User {
  _id: string;
  username: string;
  email: string;
  role: 'admin' | 'author' | 'user';
  avatar?: string;
  bio?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  icon: string;
}

export interface Post {
  _id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  coverImage?: string;
  author: User;
  category?: Category;
  tags: string[];
  status: 'draft' | 'published';
  views: number;
  likes: string[];
  readTime: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  content: string;
  author: User;
  post: string;
  isApproved: boolean;
  createdAt: string;
}

export interface Message {
  _id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  isRead: boolean;
  isStarred: boolean;
  repliedAt: string | null;
  createdAt: string;
}

export interface CommentStats {
  total: number;
  visible: number;
  hidden: number;
}

export interface MessageStats {
  total: number;
  unread: number;
  starred: number;
}

export interface SocialLink {
  _id?: string;
  label: string;
  icon: string;
  url: string;
  isActive: boolean;
}
export interface PostsResponse {
  posts: Post[];
  totalPages: number;
  currentPage: number;
  total: number;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}
