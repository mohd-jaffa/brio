import { describe, it, expect } from 'vitest';
import { pickColumns } from '@/lib/supabase/columns';

describe('pickColumns', () => {
  it('picks only allowed columns from patch object', () => {
    const patch = { name: 'New Name', phone: '9876543210', adminFlag: true };
    const allowed = ['name', 'phone'] as const;
    const result = pickColumns(patch, allowed);

    expect(result).toEqual({ name: 'New Name', phone: '9876543210' });
    expect(result).not.toHaveProperty('adminFlag');
  });
});
