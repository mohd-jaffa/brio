import { describe, it, expect } from 'vitest';
import { blankToNull, definedOnly, pickColumns } from '@/lib/supabase/columns';

describe('pickColumns', () => {
  it('picks only allowed columns from patch object', () => {
    const patch = { name: 'New Name', phone: '9876543210', adminFlag: true };
    const allowed = ['name', 'phone'] as const;
    const result = pickColumns(patch, allowed);

    expect(result).toEqual({ name: 'New Name', phone: '9876543210' });
    expect(result).not.toHaveProperty('adminFlag');
  });
});

describe('definedOnly', () => {
  it('drops the keys a patch does not carry, so "not given" never writes a column', () => {
    expect(definedOnly({ name: 'Meena', phone: undefined, email: null })).toEqual({
      name: 'Meena',
      email: null,
    });
  });

  it('keeps a value that is deliberately empty', () => {
    expect(definedOnly({ notes: '' })).toEqual({ notes: '' });
  });
});

describe('blankToNull', () => {
  it('stores a blank field as null', () => {
    expect(blankToNull('')).toBeNull();
    expect(blankToNull(null)).toBeNull();
  });

  it('leaves a field the patch does not carry alone', () => {
    expect(blankToNull(undefined)).toBeUndefined();
  });

  it('passes a real value through', () => {
    expect(blankToNull('meena@example.com')).toBe('meena@example.com');
  });
});
