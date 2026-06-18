import { idbRequest, openDatabase, txDone } from '../db/connection';
import { stores } from '../db/schema';
import type { AuditLog, AuditMeta } from '../types';
import { randomId, sha256 } from '../services/crypto.service';

const ZERO_HASH = '0'.repeat(64);

export class AuditRepository {
  static async log(action: string, user: string, details: string, patientId?: string): Promise<void> {
    const db = await openDatabase();
    const tx = db.transaction([stores.auditTrail, stores.auditMeta], 'readwrite');
    const trail = tx.objectStore(stores.auditTrail);
    const metaStore = tx.objectStore(stores.auditMeta);
    const meta = (await idbRequest(metaStore.get('head'))) as AuditMeta | undefined;
    const prevHash = meta?.lastHash ?? ZERO_HASH;
    const id = randomId('AUD');
    const timestamp = new Date().toISOString();
    const selfHash = await sha256([prevHash, id, timestamp, action, patientId ?? '', user, details].join('|'));
    const log: AuditLog = { id, timestamp, action, patientId, user, details, prevHash, selfHash };
    trail.put(log);
    metaStore.put({ id: 'head', lastHash: selfHash, lastAuditId: id } satisfies AuditMeta);
    await txDone(tx);
  }

  static async list(limit = 80): Promise<AuditLog[]> {
    const db = await openDatabase();
    const tx = db.transaction(stores.auditTrail, 'readonly');
    const index = tx.objectStore(stores.auditTrail).index('timestamp');
    const logs: AuditLog[] = [];

    await new Promise<void>((resolve, reject) => {
      const request = index.openCursor(null, 'prev');
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || logs.length >= limit) return resolve();
        logs.push(cursor.value as AuditLog);
        cursor.continue();
      };
      request.onerror = () => reject(request.error);
    });

    return logs;
  }

  static async verify(): Promise<{ isValid: boolean; corruptedIndex: number }> {
    const db = await openDatabase();
    const tx = db.transaction(stores.auditTrail, 'readonly');
    const logs = (await idbRequest(tx.objectStore(stores.auditTrail).index('timestamp').getAll())) as AuditLog[];
    logs.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    let expectedPrevHash = ZERO_HASH;
    for (let index = 0; index < logs.length; index += 1) {
      const log = logs[index];
      if (log.prevHash !== expectedPrevHash) return { isValid: false, corruptedIndex: index };
      const recomputed = await sha256(
        [log.prevHash, log.id, log.timestamp, log.action, log.patientId ?? '', log.user, log.details].join('|')
      );
      if (recomputed !== log.selfHash) return { isValid: false, corruptedIndex: index };
      expectedPrevHash = log.selfHash;
    }

    return { isValid: true, corruptedIndex: -1 };
  }
}
