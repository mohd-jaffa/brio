import { ERROR_MESSAGES, type ErrorMessageCode } from '@/constants/messages';
import { AppError } from './AppError';

export function errorMessage(err: unknown, fallback: ErrorMessageCode = 'INTERNAL_ERROR'): string {
  return err instanceof AppError && err.message ? err.message : ERROR_MESSAGES[fallback];
}
