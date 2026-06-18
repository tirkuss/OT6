import { idbRequest, openDatabase, txDone } from '../db/connection';
import { stores } from '../db/schema';
import type { BackupHistoryLog } from '../types';

export class BackupRepository {
  static async add(log: BackupHistoryLog): Promise<void> {
    const db = await openDatabase();
    const tx = db.transaction(stores.backupHistory, 'readwrite');
    tx.objectStore(stores.backupHistory).put(log);
    await txDone(tx);
  }

  static async list(): Promise<BackupHistoryLog[]> {
    const db = await openDatabase();
    const tx = db.transaction(stores.backupHistory, 'readonly');
    const logs = (await idbRequest(tx.objectStore(stores.backupHistory).index('dateTime').getAll())) as BackupHistoryLog[];
    return logs.sort((a, b) => b.dateTime.localeCompare(a.dateTime));
  }

  static async keepLatest(limit: number): Promise<void> {
    const logs = await this.list();
    const stale = logs.slice(limit);
    if (!stale.length) return;
    const db = await openDatabase();
    const tx = db.transaction(stores.backupHistory, 'readwrite');
    const store = tx.objectStore(stores.backupHistory);
    stale.forEach((log) => store.delete(log.id));
    await txDone(tx);
  }
}
