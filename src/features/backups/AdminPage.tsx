import { Copy, DatabaseBackup, Download, Upload } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { BackupRepository } from '../../repositories/backup.repository';
import { BackupService } from '../../services/backup.service';
import { formatDate } from '../../utils/date';
import { useSession } from '../../hooks/useSession';

export function AdminPage({ doctorName }: { doctorName: string }) {
  const [restoreText, setRestoreText] = useState('');
  const queryClient = useQueryClient();
  const backups = useQuery({ queryKey: ['backups'], queryFn: () => BackupRepository.list() });

  async function exportBackup() {
    try {
      const log = await BackupService.createManualBackup(doctorName);
      await BackupService.downloadOrShare(`orthotrackr_backup_${Date.now()}.json`, 'application/json', log.backupData ?? '');
      await queryClient.invalidateQueries({ queryKey: ['backups'] });
    } catch (e) {
      alert('Export failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  async function copyBackup() {
    try {
      const json = await BackupService.exportJson();
      const clipPkg = '@capacitor/clipboard';
      const { Clipboard } = await import(/* @vite-ignore */ clipPkg);
      await Clipboard.write({ string: json });
      alert('Backup JSON copied to clipboard!');
    } catch (e) {
      alert('Copy failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  async function restore(event: FormEvent) {
    event.preventDefault();
    try {
      await BackupService.restoreFromJson(restoreText);
      setRestoreText('');
      await queryClient.invalidateQueries();
      alert('Restore successful!');
    } catch (e) {
      alert('Restore failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  return (
    <section className="page-stack">
      <div className="section-header">
        <div>
          <p className="eyebrow">Local administration</p>
          <h2>Admin</h2>
        </div>
      </div>

      <div className="action-grid">
        <button className="metric-card" onClick={exportBackup}><Download /><strong>Export</strong><span>JSON backup</span></button>
        <button className="metric-card" onClick={copyBackup}><Copy /><strong>Copy</strong><span>Clipboard JSON</span></button>
      </div>

      <form className="clinical-form" onSubmit={restore}>
        <h3><Upload size={18} /> Restore backup JSON</h3>
        <textarea value={restoreText} onChange={(event) => setRestoreText(event.target.value)} placeholder="Paste OrthoTrackr v4 backup JSON" />
        <button className="primary-button" disabled={!restoreText.trim()}>Restore local vault</button>
      </form>

      <div className="panel">
        <h3><DatabaseBackup size={18} /> Backup history</h3>
        {(backups.data ?? []).slice(0, 3).map((backup) => (
          <article className="audit-row" key={backup.id}>
            <strong>{backup.action}</strong>
            <span>{backup.fileSize} · {backup.status}</span>
            <small>{formatDate(backup.dateTime)} · {backup.initiatedBy}</small>
          </article>
        ))}
      </div>

      <div className="panel developer-info" style={{ marginTop: 'auto', borderTop: '1px solid #eee', paddingTop: '2rem' }}>
        <p className="eyebrow">Developer Info</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <strong>Dr. Sukrit Thakur</strong>
          <span style={{ fontSize: '0.9rem' }}>Contact: 7036018109</span>
          <span style={{ fontSize: '0.9rem' }}>Email: sukrit1210@gmail.com</span>
          <span style={{ fontSize: '0.9rem' }}>Instagram: @shivrit_dental</span>
        </div>
      </div>
    </section>
  );
}
