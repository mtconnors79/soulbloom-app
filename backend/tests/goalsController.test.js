// Set env vars BEFORE imports
process.env.JWT_SECRET = 'test-jwt-secret';

// Module-level mock functions
const mockFindAll = jest.fn();
const mockFindOne = jest.fn();
const mockCreate = jest.fn();
const mockCount = jest.fn();
const mockFindAndCountAll = jest.fn();
const mockDestroy = jest.fn();
const mockUpdate = jest.fn();

// Mock UserGoal model
jest.mock('../models', () => ({
  UserGoal: {
    findAll: mockFindAll,
    findOne: mockFindOne,
    create: mockCreate,
    count: mockCount,
    findAndCountAll: mockFindAndCountAll,
    destroy: mockDestroy
  }
}));

// Mock goal progress service
const mockCalculateProgressForGoals = jest.fn();
const mockCalculateProgress = jest.fn();
const mockIsGoalCompleted = jest.fn();
const mockGetTimeRemaining = jest.fn();

jest.mock('../services/goalProgressService', () => ({
  calculateProgressForGoals: mockCalculateProgressForGoals,
  calculateProgress: mockCalculateProgress,
  isGoalCompleted: mockIsGoalCompleted,
  getTimeRemaining: mockGetTimeRemaining
}));

// Mock goal templates
const mockGetAllTemplates = jest.fn();
const mockGetTemplateById = jest.fn();
const mockGetTemplatesByCategory = jest.fn();

jest.mock('../data/goalTemplates', () => ({
  getAllTemplates: mockGetAllTemplates,
  getTemplateById: mockGetTemplateById,
  getTemplatesByCategory: mockGetTemplatesByCategory,
  getTemplatesByActivityType: jest.fn()
}));

// Mock badge service
const mockCheckGoalSetterBadge = jest.fn();
jest.mock('../services/badgeService', () => ({
  checkGoalSetterBadge: mockCheckGoalSetterBadge
}));

// Import controller AFTER mocks
const goalsController = require('../controllers/goalsController');

describe('GoalsController', () => {
  let mockReq, mockRes;

  // Create a factory for mock goals to ensure fresh objects
  const createMockGoal = (overrides = {}) => {
    const goal = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: 1,
      title: 'Daily Check-in',
      activity_type: 'check_in',
      target_count: 1,
      time_frame: 'daily',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      completed_at: null,
      ...overrides
    };
    goal.toJSON = () => ({ ...goal });
    goal.update = mockUpdate;
    return goal;
  };

  const mockGoal = createMockGoal();

  const mockProgress = {
    currentCount: 1,
    targetCount: 1,
    percentComplete: 100
  };

  const mockTimeRemaining = {
    endDate: new Date(),
    hoursRemaining: 12,
    daysRemaining: 0
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      user: { dbId: 1, id: 1, email: 'test@example.com' },
      body: {},
      params: {},
      query: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Default mock implementations
    mockCalculateProgress.mockResolvedValue(mockProgress);
    mockGetTimeRemaining.mockReturnValue(mockTimeRemaining);
    mockUpdate.mockResolvedValue(mockGoal);
    mockCheckGoalSetterBadge.mockResolvedValue(null);
  });

  describe('getActiveGoals', () => {
    it('should return active goals with progress', async () => {
      const goals = [mockGoal];
      mockFindAll.mockResolvedValue(goals);
      mockCalculateProgressForGoals.mockResolvedValue(
        goals.map(g => ({ ...g.toJSON(), progress: mockProgress }))
      );

      await goalsController.getActiveGoals(mockReq, mockRes);

      expect(mockFindAll).toHaveBeenCalledWith({
        where: { user_id: 1, is_active: true },
        order: [['created_at', 'DESC']]
      });
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        count: 1,
        maxAllowed: 10
      }));
    });

    it('should return empty array when no active goals', async () => {
      mockFindAll.mockResolvedValue([]);
      mockCalculateProgressForGoals.mockResolvedValue([]);

      await goalsController.getActiveGoals(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        goals: [],
        count: 0,
        maxAllowed: 10
      });
    });

    it('should handle errors gracefully', async () => {
      mockFindAll.mockRejectedValue(new Error('Database error'));

      await goalsController.getActiveGoals(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Failed to fetch goals'
      });
    });
  });

  describe('getGoalTemplates', () => {
    const templates = [
      { id: 'daily-checkin', title: 'Daily Check-in', activity_type: 'check_in', category: 'beginner' },
      { id: 'weekly-mindfulness', title: 'Weekly Mindfulness', activity_type: 'mindfulness', category: 'wellness' }
    ];

    it('should return all templates', async () => {
      mockGetAllTemplates.mockReturnValue(templates);

      await goalsController.getGoalTemplates(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        templates,
        count: 2
      });
    });

    it('should filter by category', async () => {
      mockReq.query = { category: 'beginner' };
      mockGetTemplatesByCategory.mockReturnValue([templates[0]]);

      await goalsController.getGoalTemplates(mockReq, mockRes);

      expect(mockGetTemplatesByCategory).toHaveBeenCalledWith('beginner');
      expect(mockRes.json).toHaveBeenCalledWith({
        templates: [templates[0]],
        count: 1
      });
    });

    it('should filter by activity_type', async () => {
      mockReq.query = { activity_type: 'mindfulness' };
      mockGetAllTemplates.mockReturnValue(templates);

      await goalsController.getGoalTemplates(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        templates: [templates[1]],
        count: 1
      });
    });
  });

  describe('createGoal', () => {
    const validBody = {
      title: 'Test Goal',
      activity_type: 'check_in',
      target_count: 1,
      time_frame: 'daily'
    };

    it('should create a goal successfully', async () => {
      mockReq.body = validBody;
      mockCount.mockResolvedValue(0);
      const createdGoal = createMockGoal({ title: 'Test Goal' });
      mockCreate.mockResolvedValue(createdGoal);

      await goalsController.createGoal(mockReq, mockRes);

      expect(mockCreate).toHaveBeenCalledWith({
        user_id: 1,
        title: 'Test Goal',
        activity_type: 'check_in',
        target_count: 1,
        time_frame: 'daily',
        is_active: true
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Goal created successfully'
      }));
    });

    it('should create goal from template', async () => {
      mockReq.body = { template_id: 'daily-checkin' };
      mockGetTemplateById.mockReturnValue({
        id: 'daily-checkin',
        title: 'Daily Check-in',
        activity_type: 'check_in',
        target_count: 1,
        time_frame: 'daily'
      });
      mockCount.mockResolvedValue(0);
      const createdGoal = createMockGoal();
      mockCreate.mockResolvedValue(createdGoal);

      await goalsController.createGoal(mockReq, mockRes);

      expect(mockCreate).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should reject invalid template_id', async () => {
      mockReq.body = { template_id: 'invalid' };
      mockGetTemplateById.mockReturnValue(null);

      await goalsController.createGoal(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Invalid template_id: invalid'
      });
    });

    it('should require all fields', async () => {
      mockReq.body = { title: 'Test' };

      await goalsController.createGoal(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'title, activity_type, target_count, and time_frame are required'
      });
    });

    it('should reject title over 50 characters', async () => {
      mockReq.body = {
        ...validBody,
        title: 'a'.repeat(51)
      };

      await goalsController.createGoal(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Title must be 50 characters or less'
      });
    });

    it('should reject invalid activity_type', async () => {
      mockReq.body = { ...validBody, activity_type: 'invalid' };

      await goalsController.createGoal(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json.mock.calls[0][0].message).toContain('activity_type must be one of');
    });

    it('should reject invalid time_frame', async () => {
      mockReq.body = { ...validBody, time_frame: 'yearly' };

      await goalsController.createGoal(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json.mock.calls[0][0].message).toContain('time_frame must be one of');
    });

    it('should reject target_count out of range', async () => {
      mockReq.body = { ...validBody, target_count: 101 };

      await goalsController.createGoal(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'target_count must be a number between 1 and 100'
      });
    });

    it('should reject when max goals reached', async () => {
      mockReq.body = validBody;
      mockCount.mockResolvedValue(10);

      await goalsController.createGoal(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json.mock.calls[0][0].message).toContain('Maximum of 10');
    });
  });

  describe('getGoal', () => {
    it('should return goal with progress', async () => {
      mockReq.params = { id: mockGoal.id };
      mockFindOne.mockResolvedValue(mockGoal);

      await goalsController.getGoal(mockReq, mockRes);

      expect(mockFindOne).toHaveBeenCalledWith({
        where: { id: mockGoal.id, user_id: 1 }
      });
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        goal: expect.objectContaining({
          id: mockGoal.id,
          progress: mockProgress,
          timeRemaining: mockTimeRemaining
        })
      }));
    });

    it('should return 404 when goal not found', async () => {
      mockReq.params = { id: 'nonexistent' };
      mockFindOne.mockResolvedValue(null);

      await goalsController.getGoal(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'Goal not found'
      });
    });
  });

  describe('updateGoal', () => {
    it('should update goal title', async () => {
      mockReq.params = { id: mockGoal.id };
      mockReq.body = { title: 'Updated Title' };
      mockFindOne.mockResolvedValue(mockGoal);

      await goalsController.updateGoal(mockReq, mockRes);

      expect(mockUpdate).toHaveBeenCalledWith({ title: 'Updated Title' });
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Goal updated successfully'
      }));
    });

    it('should return 404 when goal not found', async () => {
      mockReq.params = { id: 'nonexistent' };
      mockReq.body = { title: 'Updated' };
      mockFindOne.mockResolvedValue(null);

      await goalsController.updateGoal(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should reject update on inactive goal', async () => {
      mockReq.params = { id: mockGoal.id };
      mockReq.body = { title: 'Updated' };
      mockFindOne.mockResolvedValue({ ...mockGoal, is_active: false });

      await goalsController.updateGoal(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Cannot update inactive goals'
      });
    });

    it('should reject empty update', async () => {
      mockReq.params = { id: mockGoal.id };
      mockReq.body = {};
      mockFindOne.mockResolvedValue(mockGoal);

      await goalsController.updateGoal(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json.mock.calls[0][0].message).toContain('No valid fields');
    });
  });

  describe('deleteGoal', () => {
    it('should soft delete goal', async () => {
      mockReq.params = { id: mockGoal.id };
      mockFindOne.mockResolvedValue(mockGoal);

      await goalsController.deleteGoal(mockReq, mockRes);

      expect(mockUpdate).toHaveBeenCalledWith({ is_active: false });
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Goal deleted successfully'
      });
    });

    it('should return 404 when goal not found', async () => {
      mockReq.params = { id: 'nonexistent' };
      mockFindOne.mockResolvedValue(null);

      await goalsController.deleteGoal(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('completeGoal', () => {
    it('should complete a goal when target reached', async () => {
      mockReq.params = { id: mockGoal.id };
      mockFindOne.mockResolvedValue(mockGoal);
      mockIsGoalCompleted.mockResolvedValue(true);

      await goalsController.completeGoal(mockReq, mockRes);

      expect(mockUpdate).toHaveBeenCalledWith({
        completed_at: expect.any(Date),
        is_active: false
      });
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Goal completed successfully'
      }));
    });

    it('should reject when target not reached', async () => {
      mockReq.params = { id: mockGoal.id };
      mockFindOne.mockResolvedValue(mockGoal);
      mockIsGoalCompleted.mockResolvedValue(false);

      await goalsController.completeGoal(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Bad Request',
        message: 'Goal target not yet reached'
      }));
    });

    it('should reject already completed goal', async () => {
      mockReq.params = { id: mockGoal.id };
      mockFindOne.mockResolvedValue({ ...mockGoal, completed_at: new Date() });

      await goalsController.completeGoal(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Goal is already completed'
      });
    });

    it('should reject inactive goal', async () => {
      mockReq.params = { id: mockGoal.id };
      mockFindOne.mockResolvedValue({ ...mockGoal, is_active: false });

      await goalsController.completeGoal(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Goal is not active'
      });
    });
  });

  describe('getGoalHistory', () => {
    it('should return goal history with pagination', async () => {
      const historyGoals = [{ ...mockGoal, is_active: false, completed_at: new Date() }];
      mockFindAndCountAll.mockResolvedValue({ count: 1, rows: historyGoals });

      await goalsController.getGoalHistory(mockReq, mockRes);

      expect(mockFindAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
        where: { user_id: 1, is_active: false }
      }));
      expect(mockRes.json).toHaveBeenCalledWith({
        goals: historyGoals,
        pagination: {
          total: 1,
          limit: 50,
          offset: 0,
          hasMore: false
        }
      });
    });

    it('should filter completed_only', async () => {
      mockReq.query = { completed_only: 'true' };
      mockFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      await goalsController.getGoalHistory(mockReq, mockRes);

      expect(mockFindAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          completed_at: expect.any(Object)
        })
      }));
    });
  });

  describe('deleteGoalHistory', () => {
    it('should delete all history', async () => {
      mockDestroy.mockResolvedValue(5);

      await goalsController.deleteGoalHistory(mockReq, mockRes);

      expect(mockDestroy).toHaveBeenCalledWith({
        where: { user_id: 1, is_active: false }
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Deleted 5 goal(s) from history',
        deletedCount: 5
      });
    });

    it('should filter by older_than_days', async () => {
      mockReq.query = { older_than_days: '30' };
      mockDestroy.mockResolvedValue(3);

      await goalsController.deleteGoalHistory(mockReq, mockRes);

      expect(mockDestroy).toHaveBeenCalledWith({
        where: expect.objectContaining({
          updated_at: expect.any(Object)
        })
      });
    });
  });

  describe('getGoalsSummary', () => {
    it('should return summary statistics', async () => {
      mockCount.mockResolvedValueOnce(2)  // activeCount
        .mockResolvedValueOnce(5)          // completedCount
        .mockResolvedValueOnce(1);         // abandonedCount
      mockFindAll.mockResolvedValue([mockGoal, mockGoal]);
      mockCalculateProgressForGoals.mockResolvedValue([
        { progress: { percentComplete: 50 } },
        { progress: { percentComplete: 100 } }
      ]);

      await goalsController.getGoalsSummary(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        summary: {
          activeGoals: 2,
          completedGoals: 5,
          abandonedGoals: 1,
          totalGoals: 8,
          overallProgress: 75,
          maxAllowed: 10,
          slotsRemaining: 8
        }
      });
    });

    it('should handle no active goals', async () => {
      mockCount.mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockFindAll.mockResolvedValue([]);

      await goalsController.getGoalsSummary(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        summary: {
          activeGoals: 0,
          completedGoals: 0,
          abandonedGoals: 0,
          totalGoals: 0,
          overallProgress: 0,
          maxAllowed: 10,
          slotsRemaining: 10
        }
      });
    });
  });
});
