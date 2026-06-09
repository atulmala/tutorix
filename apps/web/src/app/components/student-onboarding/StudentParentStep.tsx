import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  GET_MY_STUDENT_PROFILE,
  SAVE_STUDENT_PARENT_STEP,
} from '@tutorix/shared-graphql';
import type { StudentStepComponentProps } from './types';

const inputCls = (hasError: boolean) =>
  `h-11 w-full rounded-lg border px-3 text-sm text-primary outline-none transition focus:ring-2 focus:ring-primary/30 ${
    hasError ? 'border-danger' : 'border-subtle'
  }`;

export const StudentParentStep: React.FC<StudentStepComponentProps> = () => {
  const [parentRelation, setParentRelation] = useState<'FATHER' | 'MOTHER'>('FATHER');
  const [parentName, setParentName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [saveParent, { loading }] = useMutation(SAVE_STUDENT_PARENT_STEP, {
    refetchQueries: [{ query: GET_MY_STUDENT_PROFILE }],
    awaitRefetchQueries: true,
    onError: (err) => {
      setError(
        err.graphQLErrors?.[0]?.message ||
          err.message ||
          'Failed to save. Please try again.',
      );
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!parentName.trim()) {
      setError('Parent name is required');
      return;
    }
    await saveParent({
      variables: {
        input: { parentRelation, parentName: parentName.trim() },
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <p className="text-sm text-muted">
          Please provide details for one parent or guardian.
        </p>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium text-primary">
          Relationship <span className="text-danger">*</span>
        </span>
        <div className="flex gap-4">
          {(['FATHER', 'MOTHER'] as const).map((value) => (
            <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="parentRelation"
                value={value}
                checked={parentRelation === value}
                onChange={() => setParentRelation(value)}
                className="h-4 w-4 accent-[#5fa8ff]"
              />
              {value === 'FATHER' ? 'Father' : 'Mother'}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-primary">
          Name <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          value={parentName}
          onChange={(e) => setParentName(e.target.value)}
          className={inputCls(!!error && !parentName.trim())}
          placeholder="Enter parent or guardian name"
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="h-11 rounded-lg bg-[#5fa8ff] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5] disabled:cursor-not-allowed disabled:bg-[#5fa8ff]/40"
        >
          {loading ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </form>
  );
};
