import { idbRequest, openDatabase, txDone } from '../db/connection';
import { stores } from '../db/schema';
import type { PhotoBlobRecord, PhotoMetadata } from '../types';
import { randomId } from '../services/crypto.service';
import { logAppError } from '../services/error.service';
import { compressImage } from '../services/image.service';
import { AuditRepository } from './audit.repository';
import { PatientRepository } from './patient.repository';

export class PhotoRepository {
  static async addPatientPhoto(patientId: string, file: File, label: string, user: string): Promise<PhotoMetadata> {
    let blob: Blob;
    try {
      blob = await compressImage(file);
    } catch (error) {
      logAppError('PhotoRepository.compressImage', error);
      blob = file;
    }
    const metadata: PhotoMetadata = {
      id: randomId('IMG'),
      patientId,
      label,
      mimeType: blob.type || 'image/webp',
      size: blob.size,
      dateCaptured: new Date().toISOString()
    };
    try {
      const db = await openDatabase();
      const tx = db.transaction([stores.photoMetadata, stores.photoBlobs], 'readwrite');
      tx.objectStore(stores.photoMetadata).put(metadata);
      tx.objectStore(stores.photoBlobs).put({ id: metadata.id, blob } satisfies PhotoBlobRecord);
      await txDone(tx);
    } catch (error) {
      logAppError('PhotoRepository.addPatientPhoto', error);
      throw error;
    }

    const patient = await PatientRepository.getById(patientId);
    if (patient && !patient.photoIds.includes(metadata.id)) {
      await PatientRepository.save({ ...patient, photoIds: [...patient.photoIds, metadata.id] }, user, patient);
    }
    await AuditRepository.log('ADD_PATIENT_PHOTO', user, `Added ${label || 'clinical photo'}`, patientId);
    return metadata;
  }

  static async listMetadata(patientId: string): Promise<PhotoMetadata[]> {
    const db = await openDatabase();
    const tx = db.transaction(stores.photoMetadata, 'readonly');
    const index = tx.objectStore(stores.photoMetadata).index('patientId');
    return idbRequest(index.getAll(patientId)) as Promise<PhotoMetadata[]>;
  }

  static async getBlob(id: string): Promise<Blob | undefined> {
    const db = await openDatabase();
    const tx = db.transaction(stores.photoBlobs, 'readonly');
    const record = (await idbRequest(tx.objectStore(stores.photoBlobs).get(id))) as PhotoBlobRecord | undefined;
    return record?.blob;
  }
}
