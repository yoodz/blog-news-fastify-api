'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// JWT 密钥（生产环境应从环境变量读取）
const JWT_SECRET = process.env.JWT_SECRET || 'blog-news-secret-key-2024';
const JWT_EXPIRES_IN = '7d'; // token 有效期

/**
 * 密码加密
 * @param {string} password - 原始密码
 * @returns {Promise<string>} 加密后的密码
 */
async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * 验证密码
 * @param {string} password - 原始密码
 * @param {string} hashedPassword - 加密后的密码
 * @returns {Promise<boolean>} 密码是否匹配
 */
async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * 生成 JWT Token
 * @param {object} payload - Token 载荷
 * @returns {string} JWT Token
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}

/**
 * 验证 JWT Token
 * @param {string} token - JWT Token
 * @returns {object} 解码后的载荷
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * 从请求头中提取 Token
 * @param {object} headers - 请求头
 * @returns {string|null} Token 或 null
 */
function extractToken(headers) {
  const authorization = headers.authorization || headers.Authorization;

  if (!authorization) {
    return null;
  }

  // 支持 "Bearer <token>" 格式
  const parts = authorization.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }

  // 直接返回 token
  return authorization;
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  extractToken,
  JWT_SECRET
};
