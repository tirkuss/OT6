import { ShieldCheck } from 'lucide-react';
import { FormEvent, useState } from 'react';
import type { DoctorProfile } from '../../types';

export function OnboardingPage({ onSetup }: { onSetup: (profile: DoctorProfile) => Promise<void> }) {
  const [doctorName, setDoctorName] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await onSetup({ doctorName: doctorName.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set up profile.');
    }
  }

  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <ShieldCheck size={36} />
        <h1>Welcome to OrthoTrackr</h1>
        <p>Offline-only clinical records for your practice.</p>
        <label>
          Doctor name
          <input required value={doctorName} onChange={(event) => setDoctorName(event.target.value)} autoComplete="off" autoFocus />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary-button" type="submit">Start practicing</button>
      </form>
    </section>
  );
}
