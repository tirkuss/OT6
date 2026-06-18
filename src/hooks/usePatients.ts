import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PatientRepository } from '../repositories/patient.repository';
import type { Patient } from '../types';

export function usePatientQuery(search: string, archived = false, status = '') {
  return useQuery({
    queryKey: ['patients', search, archived, status],
    queryFn: () => PatientRepository.query({ search, archived, status: status || undefined, limit: 120 })
  });
}

export function usePatient(id?: string) {
  return useQuery({
    queryKey: ['patient', id],
    queryFn: () => (id ? PatientRepository.getById(id) : undefined),
    enabled: Boolean(id)
  });
}

export function usePatientMutations(user: string) {
  const queryClient = useQueryClient();

  const invalidate = async (patientId?: string) => {
    await queryClient.invalidateQueries({ queryKey: ['patients'] });
    if (patientId) await queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
  };

  return {
    createPatient: useMutation({
      mutationFn: (input: Parameters<typeof PatientRepository.create>[0]) => PatientRepository.create(input, user),
      onSuccess: (patient) => invalidate(patient.id)
    }),
    savePatient: useMutation({
      mutationFn: ({ patient, previous }: { patient: Patient; previous?: Patient }) => PatientRepository.save(patient, user, previous),
      onSuccess: (patient) => invalidate(patient.id)
    }),
    archivePatient: useMutation({
      mutationFn: ({ id, archived }: { id: string; archived: boolean }) => PatientRepository.archive(id, archived, user),
      onSuccess: (_, vars) => invalidate(vars.id)
    })
  };
}
