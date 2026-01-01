import { ZodError } from 'zod';

export type ActionState<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function actionWrapper<T>(
  fn: () => Promise<T>
): Promise<ActionState<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: 'Validation failed',
        fieldErrors: error.flatten().fieldErrors as Record<string, string[]>
      };
    }

    if (error instanceof Error) {
      console.error('Action error:', error);
      return { success: false, error: error.message };
    }

    return { success: false, error: 'An unexpected error occurred' };
  }
}