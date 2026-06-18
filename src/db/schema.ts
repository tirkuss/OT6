export const DB_NAME = 'OrthoTrackerDB';
export const DB_VERSION = 4;

export const stores = {
  patients: 'patients',
  appointments: 'appointments',
  backupHistory: 'backup_history',
  auditTrail: 'audit_trail',
  auditMeta: 'audit_meta',
  photoMetadata: 'photo_metadata',
  photoBlobs: 'photo_blobs'
} as const;

export function createSchema(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(stores.patients)) {
    const patients = db.createObjectStore(stores.patients, { keyPath: 'id' });
    patients.createIndex('nameLowercase', 'nameLowercase', { unique: false });
    patients.createIndex('phone', 'phone', { unique: false });
    patients.createIndex('email', 'email', { unique: false });
    patients.createIndex('treatmentStatus', 'treatmentStatus', { unique: false });
    patients.createIndex('clinic', 'clinic', { unique: false });
    patients.createIndex('archived', 'archived', { unique: false });
    patients.createIndex('registrationDate', 'registrationDate', { unique: false });
  }

  if (!db.objectStoreNames.contains(stores.appointments)) {
    const appointments = db.createObjectStore(stores.appointments, { keyPath: 'id' });
    appointments.createIndex('date', 'date', { unique: false });
    appointments.createIndex('patientId', 'patientId', { unique: false });
    appointments.createIndex('status', 'status', { unique: false });
  }

  if (!db.objectStoreNames.contains(stores.backupHistory)) {
    const backupHistory = db.createObjectStore(stores.backupHistory, { keyPath: 'id' });
    backupHistory.createIndex('dateTime', 'dateTime', { unique: false });
  }

  if (!db.objectStoreNames.contains(stores.auditTrail)) {
    const auditTrail = db.createObjectStore(stores.auditTrail, { keyPath: 'id' });
    auditTrail.createIndex('timestamp', 'timestamp', { unique: false });
    auditTrail.createIndex('patientId', 'patientId', { unique: false });
    auditTrail.createIndex('user', 'user', { unique: false });
  }

  if (!db.objectStoreNames.contains(stores.auditMeta)) {
    db.createObjectStore(stores.auditMeta, { keyPath: 'id' });
  }

  if (!db.objectStoreNames.contains(stores.photoMetadata)) {
    const photoMetadata = db.createObjectStore(stores.photoMetadata, { keyPath: 'id' });
    photoMetadata.createIndex('patientId', 'patientId', { unique: false });
    photoMetadata.createIndex('dateCaptured', 'dateCaptured', { unique: false });
  }

  if (!db.objectStoreNames.contains(stores.photoBlobs)) {
    db.createObjectStore(stores.photoBlobs, { keyPath: 'id' });
  }
}
