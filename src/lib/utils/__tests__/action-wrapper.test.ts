import { describe, it, expect, vi } from 'vitest';
import { actionWrapper } from '@/lib/utils/action-wrapper';
import { ZodError } from 'zod';

describe('actionWrapper', () => {
  it('should return success result for successful operations', async () => {
    const mockFn = async () => 'test result';

    const result = await actionWrapper(mockFn);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('test result');
    }
  });

  it('should handle Zod validation errors', async () => {
    const mockFn = async () => {
      throw new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          path: ['testField'],
          message: 'Expected string, received number'
        } as const
      ]);
    };

    const result = await actionWrapper(mockFn);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Validation failed');
      expect(result.fieldErrors).toBeDefined();
    }
  });

  it('should handle generic errors', async () => {
    // Mock console.error to suppress expected error logging
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const mockFn = async () => {
      throw new Error('Test error');
    };

    const result = await actionWrapper(mockFn);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Test error');
    }

    // Verify error was logged and restore console.error
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});