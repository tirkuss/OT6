import { LockKeyhole } from 'lucide-react';
import { FormEvent, useState } from 'react';

export function LockScreen({ onUnlock }: { onUnlock: (passcode: string) => Promise<boolean> }) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    const ok = await onUnlock(passcode);
    setError(ok ? '' : 'Passcode did not match this device vault.');
  }

  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <LockKeyhole size={36} />
        <h1>Vault locked</h1>
        <p>Enter the local doctor passcode to continue.</p>
        <label>
          Passcode
          <input autoFocus value={passcode} onChange={(event) => setPasscode(event.target.value)} type="password" />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary-button" type="submit">Unlock</button>
      </form>
    </section>
  );
}
