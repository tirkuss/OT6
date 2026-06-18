import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppointmentRepository } from '../repositories/appointment.repository';
import { monthBounds } from '../utils/date';

export function useMonthAppointments(month: Date) {
  const { start, end } = monthBounds(month);
  return useQuery({
    queryKey: ['appointments', start, end],
    queryFn: () => AppointmentRepository.listRange(start, end)
  });
}

export function useAppointmentMutations(user: string) {
  const queryClient = useQueryClient();
  return {
    createAppointment: useMutation({
      mutationFn: (input: Parameters<typeof AppointmentRepository.create>[0]) => AppointmentRepository.create(input, user),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] })
    })
  };
}
