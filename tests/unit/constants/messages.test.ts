import { describe, it, expect } from 'vitest';
import { ERROR_MESSAGES, VALIDATION_MESSAGES, getErrorMessage, isErrorMessageCode } from '@/constants/messages';

describe('Messages Configuration', () => {
  it('should have properly formatted validation messages', () => {
    expect(VALIDATION_MESSAGES.required('Name')).toBe('Name needs a value.');
    expect(VALIDATION_MESSAGES.notNegative('Price')).toBe('Price cannot be negative.');
  });

  it('should correctly identify error codes', () => {
    expect(isErrorMessageCode('VALIDATION_ERROR')).toBe(true);
    expect(isErrorMessageCode('NON_EXISTENT_CODE')).toBe(false);
  });

  it('should return correct error message for known codes', () => {
    expect(getErrorMessage('VALIDATION_ERROR')).toBe(ERROR_MESSAGES.VALIDATION_ERROR);
  });

  it('should fallback to INTERNAL_ERROR for unknown codes', () => {
    expect(getErrorMessage('NON_EXISTENT_CODE')).toBe(ERROR_MESSAGES.INTERNAL_ERROR);
  });
});
