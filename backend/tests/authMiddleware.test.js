// Set env vars BEFORE imports
process.env.JWT_SECRET = 'test-jwt-secret-key';

const jwt = require('jsonwebtoken');

// Module-level mock functions
const mockFindByPk = jest.fn();
const mockFindOne = jest.fn();
const mockCreate = jest.fn();
const mockVerifyIdToken = jest.fn();

// Mock Firebase
jest.mock('../config/firebase', () => ({
  verifyIdToken: mockVerifyIdToken
}));

// Mock models
jest.mock('../models', () => ({
  User: {
    findByPk: mockFindByPk,
    findOne: mockFindOne,
    create: mockCreate
  },
  Profile: {
    create: jest.fn().mockResolvedValue({})
  }
}));

// Import middleware AFTER mocks
const {
  authenticateToken,
  authenticateAndLoadUser,
  optionalAuth,
  verifyToken
} = require('../middleware/auth');

describe('Auth Middleware', () => {
  let mockReq, mockRes, mockNext;

  const testUser = {
    id: 1,
    email: 'test@example.com',
    created_at: new Date()
  };

  const generateJWT = (payload = { id: 1, email: 'test@example.com' }) => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      headers: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockNext = jest.fn();

    // Default mock implementations
    mockVerifyIdToken.mockRejectedValue(new Error('Invalid Firebase token'));
  });

  describe('verifyToken', () => {
    it('should verify valid JWT token', async () => {
      const token = generateJWT();

      const result = await verifyToken(token);

      expect(result.type).toBe('jwt');
      expect(result.decoded.id).toBe(1);
      expect(result.decoded.email).toBe('test@example.com');
    });

    it('should verify valid Firebase token when JWT fails', async () => {
      const firebaseDecoded = {
        uid: 'firebase-uid-123',
        email: 'firebase@example.com',
        email_verified: true
      };
      mockVerifyIdToken.mockResolvedValue(firebaseDecoded);

      const result = await verifyToken('invalid-jwt-but-valid-firebase');

      expect(result.type).toBe('firebase');
      expect(result.decoded.uid).toBe('firebase-uid-123');
    });

    it('should throw error for invalid token', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid'));

      await expect(verifyToken('invalid-token')).rejects.toThrow('Invalid token');
    });
  });

  describe('authenticateToken', () => {
    it('should authenticate valid JWT token', async () => {
      const token = generateJWT();
      mockReq.headers.authorization = `Bearer ${token}`;

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.id).toBe(1);
      expect(mockReq.user.email).toBe('test@example.com');
      expect(mockReq.user.tokenType).toBe('jwt');
    });

    it('should authenticate valid Firebase token', async () => {
      const firebaseDecoded = {
        uid: 'firebase-uid-123',
        email: 'firebase@example.com',
        email_verified: true,
        name: 'Firebase User',
        picture: 'https://example.com/pic.jpg'
      };
      mockVerifyIdToken.mockResolvedValue(firebaseDecoded);
      mockReq.headers.authorization = 'Bearer firebase-token';

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user.uid).toBe('firebase-uid-123');
      expect(mockReq.user.tokenType).toBe('firebase');
      expect(mockReq.user.name).toBe('Firebase User');
    });

    it('should reject missing authorization header', async () => {
      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'No authorization header provided'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid authorization format', async () => {
      mockReq.headers.authorization = 'Basic token123';

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid authorization format. Use: Bearer <token>'
      });
    });

    it('should reject empty token after Bearer', async () => {
      mockReq.headers.authorization = 'Bearer ';

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'No token provided'
      });
    });

    it('should reject invalid token', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token';

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Authentication failed'
      });
    });

    it('should reject expired JWT token', async () => {
      const expiredToken = jwt.sign(
        { id: 1, email: 'test@example.com' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' }
      );
      mockReq.headers.authorization = `Bearer ${expiredToken}`;

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Authentication failed'
      });
    });
  });

  describe('authenticateAndLoadUser', () => {
    it('should load user for valid JWT token', async () => {
      const token = generateJWT();
      mockReq.headers.authorization = `Bearer ${token}`;
      mockFindByPk.mockResolvedValue(testUser);

      await authenticateAndLoadUser(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockFindByPk).toHaveBeenCalledWith(1, {
        attributes: ['id', 'email', 'created_at']
      });
      expect(mockReq.user.id).toBe(1);
      expect(mockReq.user.dbId).toBe(1);
      expect(mockReq.user.dbUser).toBe(testUser);
      expect(mockReq.user.tokenType).toBe('jwt');
    });

    it('should load user for Firebase token by email', async () => {
      const firebaseDecoded = {
        uid: 'firebase-uid-123',
        email: 'firebase@example.com',
        email_verified: true
      };
      mockVerifyIdToken.mockResolvedValue(firebaseDecoded);
      mockReq.headers.authorization = 'Bearer firebase-token';
      mockFindOne.mockResolvedValue(testUser);

      await authenticateAndLoadUser(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockFindOne).toHaveBeenCalledWith({
        where: { email: 'firebase@example.com' },
        attributes: ['id', 'email', 'created_at']
      });
      expect(mockReq.user.uid).toBe('firebase-uid-123');
      expect(mockReq.user.tokenType).toBe('firebase');
    });

    it('should auto-create user for new Firebase accounts', async () => {
      const firebaseDecoded = {
        uid: 'new-firebase-uid',
        email: 'new@example.com',
        email_verified: true,
        name: 'New User'
      };
      mockVerifyIdToken.mockResolvedValue(firebaseDecoded);
      mockReq.headers.authorization = 'Bearer firebase-token';
      mockFindOne.mockResolvedValue(null);
      mockCreate.mockResolvedValue({ id: 2, email: 'new@example.com' });
      mockFindByPk.mockResolvedValue({ id: 2, email: 'new@example.com', created_at: new Date() });

      await authenticateAndLoadUser(mockReq, mockRes, mockNext);

      expect(mockCreate).toHaveBeenCalledWith({
        email: 'new@example.com',
        password_hash: 'firebase:new-firebase-uid'
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 404 for JWT user not in database', async () => {
      const token = generateJWT();
      mockReq.headers.authorization = `Bearer ${token}`;
      mockFindByPk.mockResolvedValue(null);

      await authenticateAndLoadUser(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'User not found in database'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject missing authorization', async () => {
      await authenticateAndLoadUser(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'No valid authorization header provided'
      });
    });

    it('should reject invalid Bearer format', async () => {
      mockReq.headers.authorization = 'Token xyz';

      await authenticateAndLoadUser(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('optionalAuth', () => {
    it('should set user for valid JWT', async () => {
      const token = generateJWT();
      mockReq.headers.authorization = `Bearer ${token}`;

      await optionalAuth(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.id).toBe(1);
      expect(mockReq.user.tokenType).toBe('jwt');
    });

    it('should set user for valid Firebase token', async () => {
      const firebaseDecoded = {
        uid: 'firebase-uid',
        email: 'fb@example.com',
        email_verified: true
      };
      mockVerifyIdToken.mockResolvedValue(firebaseDecoded);
      mockReq.headers.authorization = 'Bearer firebase-token';

      await optionalAuth(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user.uid).toBe('firebase-uid');
      expect(mockReq.user.tokenType).toBe('firebase');
    });

    it('should set user to null when no auth header', async () => {
      await optionalAuth(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeNull();
    });

    it('should set user to null for invalid Bearer format', async () => {
      mockReq.headers.authorization = 'Basic xyz';

      await optionalAuth(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeNull();
    });

    it('should set user to null for invalid token', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token';

      await optionalAuth(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeNull();
    });
  });
});
