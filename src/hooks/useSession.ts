import { useCallback, useEffect, useState } from 'react';
import type { DoctorProfile } from '../types';
import { getDoctorProfile, hasVault, setupDoctorVault } from '../services/session.service';

export function useSession() {
  const [profile, setProfile] = useState<DoctorProfile | null>(() => getDoctorProfile());
  const [isUnlocked, setUnlocked] = useState(true);

  const setup = useCallback(async (nextProfile: DoctorProfile) => {
    await setupDoctorVault(nextProfile);
    setProfile(nextProfile);
    setUnlocked(true);
  }, []);

  return { 
    profile, 
    isUnlocked, 
    needsSetup: !hasVault(), 
    setup, 
    unlock: async () => true, 
    lock: () => {} 
  };
}
