import type { DoctorProfile } from '../types';

const profileKey = 'orthotrackr_doctor_profile';

export function getDoctorProfile(): DoctorProfile | null {
  const raw = localStorage.getItem(profileKey);
  return raw ? (JSON.parse(raw) as DoctorProfile) : null;
}

export async function setupDoctorVault(profile: DoctorProfile): Promise<void> {
  localStorage.setItem(profileKey, JSON.stringify(profile));
}

export function hasVault(): boolean {
  return Boolean(localStorage.getItem(profileKey));
}

export async function unlockVault(): Promise<boolean> {
  return true;
}
