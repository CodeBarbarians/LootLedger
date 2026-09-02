import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import {
  addContribution,
  archiveGoal,
  deleteGoal,
  createGoal,
  listGoalContributions,
  listGoals,
  listGoalsWithProgress,
  unarchiveGoal,
  updateGoal,
} from '../db/repositories/goals';
import type { Goal } from '../db/types';

export function useGoals(profileId: number | undefined, includeArchived = false) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['goals', profileId, includeArchived],
    queryFn: () => listGoals(db, profileId as number, includeArchived),
    enabled: profileId != null,
  });
}

export function useGoalsWithProgress(profileId: number | undefined, includeArchived = false) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['goalsWithProgress', profileId, includeArchived],
    queryFn: () => listGoalsWithProgress(db, profileId as number, includeArchived),
    enabled: profileId != null,
  });
}

export function useGoalContributions(goalId: number | undefined) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: ['goalContributions', goalId],
    queryFn: () => listGoalContributions(db, goalId as number),
    enabled: goalId != null,
  });
}

export function useCreateGoal(profileId: number) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      targetAmount: number;
      targetDate: string | null;
      color: string;
    }) => createGoal(db, profileId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals', profileId] });
      queryClient.invalidateQueries({ queryKey: ['goalsWithProgress', profileId] });
    },
  });
}

export function useUpdateGoal(profileId: number) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: number;
      patch: Partial<Pick<Goal, 'name' | 'target_amount' | 'target_date' | 'color'>>;
    }) => updateGoal(db, profileId, id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals', profileId] });
      queryClient.invalidateQueries({ queryKey: ['goalsWithProgress', profileId] });
    },
  });
}

export function useArchiveGoal(profileId: number) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => archiveGoal(db, profileId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals', profileId] });
      queryClient.invalidateQueries({ queryKey: ['goalsWithProgress', profileId] });
    },
  });
}

export function useUnarchiveGoal(profileId: number) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unarchiveGoal(db, profileId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals', profileId] });
      queryClient.invalidateQueries({ queryKey: ['goalsWithProgress', profileId] });
    },
  });
}

export function useAddContribution(profileId: number) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      goalId,
      data,
    }: {
      goalId: number;
      data: { amount: number; note: string | null };
    }) => addContribution(db, goalId, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['goals', profileId] });
      queryClient.invalidateQueries({ queryKey: ['goalsWithProgress', profileId] });
      queryClient.invalidateQueries({ queryKey: ['goalContributions', variables.goalId] });
    },
  });
}

export function useDeleteGoal(profileId: number) {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteGoal(db, profileId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals', profileId] });
    },
  });
}
