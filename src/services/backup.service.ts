import { idbRequest, openDatabase, txDone } from '../db/connection';
import { stores } from '../db/schema';
import { BackupRepository } from '../repositories/backup.repository';
import type { Appointment, AuditLog, BackupHistoryLog, BackupPayload, Patient, PhotoMetadata } from '../types';
import { randomId } from './crypto.service';

export class BackupService {
  static async exportJson(incrementalSince?: string): Promise<string> {
    const db = await openDatabase();
    const allPatients = await getAll<Patient>(db, stores.patients);
    const allAppointments = await getAll<Appointment>(db, stores.appointments);
    const allPhotoMetadata = await getAll<PhotoMetadata>(db, stores.photoMetadata);
    const allPhotoBlobs = await getAll<{ id: string; blob: Blob }>(db, stores.photoBlobs);

    let patients = allPatients;
    let appointments = allAppointments;

    if (incrementalSince) {
      const sinceDate = new Date(incrementalSince);
      patients = allPatients.filter(p => new Date(p.registrationDate) > sinceDate || p.changeLogs.some(cl => new Date(cl.timestamp) > sinceDate));
      appointments = allAppointments.filter(a => new Date(a.date) > sinceDate);
    }

    const photoBlobsBase64 = await Promise.all(allPhotoBlobs.map(async (item) => {
      const base64 = await blobToBase64(item.blob);
      const metadata = allPhotoMetadata.find(m => m.id === item.id);
      return {
        id: item.id,
        base64,
        mimeType: metadata?.mimeType || 'image/webp'
      };
    }));

    const payload: BackupPayload = {
      exportDate: new Date().toISOString(),
      schemaVersion: 4,
      patients,
      appointments,
      backupLogs: [], // Exclude backup history to prevent exponential size bloat
      auditLogs: await getAll<AuditLog>(db, stores.auditTrail),
      photoMetadata: allPhotoMetadata,
      photoBlobs: photoBlobsBase64
    };

    return JSON.stringify(payload, null, 2);
  }

  static async createManualBackup(user: string): Promise<BackupHistoryLog> {
    const backupData = await this.exportJson();
    const log = makeBackupLog('Manual JSON Backup', user, backupData);
    await BackupRepository.add(log);
    return log;
  }

  static async restoreFromJson(json: string): Promise<void> {
    const payload = JSON.parse(json) as BackupPayload;
    if (!payload || payload.schemaVersion !== 4 || !Array.isArray(payload.patients)) {
      throw new Error('Backup format is not compatible with OrthoTrackr v4.');
    }

    const db = await openDatabase();
    const tx = db.transaction([
      stores.patients, 
      stores.appointments, 
      stores.backupHistory, 
      stores.auditTrail, 
      stores.photoMetadata,
      stores.photoBlobs
    ], 'readwrite');
    
    [
      stores.patients, 
      stores.appointments, 
      stores.backupHistory, 
      stores.auditTrail, 
      stores.photoMetadata,
      stores.photoBlobs
    ].forEach((storeName) => {
      tx.objectStore(storeName).clear();
    });

    payload.patients.forEach((record) => tx.objectStore(stores.patients).put(record));
    payload.appointments.forEach((record) => tx.objectStore(stores.appointments).put(record));
    payload.backupLogs.forEach((record) => tx.objectStore(stores.backupHistory).put(record));
    payload.auditLogs.forEach((record) => tx.objectStore(stores.auditTrail).put(record));
    payload.photoMetadata.forEach((record) => tx.objectStore(stores.photoMetadata).put(record));
    
    if (payload.photoBlobs) {
      payload.photoBlobs.forEach((record) => {
        const blob = base64ToBlob(record.base64, record.mimeType);
        tx.objectStore(stores.photoBlobs).put({ id: record.id, blob });
      });
    }

    await txDone(tx);
  }

  static async downloadOrShare(filename: string, mimeType: string, content: string): Promise<void> {
    const fsPkg = '@capacitor/filesystem';
    const { Filesystem, Directory } = await import(/* @vite-ignore */ fsPkg);
    const sharePkg = '@capacitor/share';
    const { Share } = await import(/* @vite-ignore */ sharePkg);

    const blob = new Blob([content], { type: mimeType });
    const base64 = await blobToBase64(blob);

    const result = await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Cache
    });

    await Share.share({
      title: filename,
      text: 'Exporting OrthoTrackr Backup',
      files: [result.uri],
      dialogTitle: 'Save backup'
    });
  }
}

function makeBackupLog(action: string, user: string, backupData: string): BackupHistoryLog {
  const sizeMb = new Blob([backupData]).size / 1024 / 1024;
  return {
    id: randomId('B'),
    dateTime: new Date().toISOString(),
    action,
    initiatedBy: user,
    status: 'COMPLETED',
    fileSize: `${sizeMb.toFixed(3)} MB`,
    backupData: '' // Do not store the actual backup JSON string in IndexedDB to prevent exponential DB growth
  };
}

async function getAll<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  const tx = db.transaction(storeName, 'readonly');
  return idbRequest(tx.objectStore(storeName).getAll()) as Promise<T[]>;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
