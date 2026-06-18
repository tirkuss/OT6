import { idbRequest, openDatabase, txDone } from '../db/connection';
import { stores } from '../db/schema';
import type { ChangeLog, Patient } from '../types';
import { randomId } from '../services/crypto.service';
import { AuditRepository } from './audit.repository';

export class PatientRepository {
  static async query(params: {
    search?: string;
    status?: string;
    archived?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Patient[]> {
    const db = await openDatabase();
    const tx = db.transaction(stores.patients, 'readonly');
    const store = tx.objectStore(stores.patients);
    const search = params.search?.trim().toLowerCase() ?? '';
    const limit = params.limit ?? 80;
    const offset = params.offset ?? 0;
    const results: Patient[] = [];
    let seen = 0;

    await new Promise<void>((resolve, reject) => {
      const source = search ? store.index('nameLowercase') : store.index('registrationDate');
      const range = search ? IDBKeyRange.bound(search, `${search}\uffff`) : null;
      const request = source.openCursor(range, search ? 'next' : 'prev');

      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || results.length >= limit) return resolve();
        const patient = cursor.value as Patient;
        const textMatch =
          !search ||
          patient.nameLowercase.includes(search) ||
          patient.phone.toLowerCase().includes(search) ||
          patient.email.toLowerCase().includes(search) ||
          patient.id.toLowerCase().includes(search) ||
          (patient.clinic ?? '').toLowerCase().includes(search);
        const statusMatch = !params.status || patient.treatmentStatus === params.status;
        const archiveMatch = params.archived === undefined || Boolean(patient.archived) === params.archived;

        if (textMatch && statusMatch && archiveMatch) {
          if (seen >= offset) results.push(patient);
          seen += 1;
        }
        cursor.continue();
      };
      request.onerror = () => reject(request.error);
    });

    return results;
  }

  static async getById(id: string): Promise<Patient | undefined> {
    const db = await openDatabase();
    const tx = db.transaction(stores.patients, 'readonly');
    return idbRequest(tx.objectStore(stores.patients).get(id)) as Promise<Patient | undefined>;
  }

  static async count(): Promise<number> {
    const db = await openDatabase();
    const tx = db.transaction(stores.patients, 'readonly');
    return idbRequest(tx.objectStore(stores.patients).count());
  }

  static async create(input: Omit<Patient, 'id' | 'nameLowercase' | 'registrationDate' | 'photoIds' | 'progressLogs' | 'changeLogs'>, user: string): Promise<Patient> {
    const patient: Patient = {
      ...input,
      id: randomId('P'),
      nameLowercase: input.name.trim().toLowerCase(),
      registrationDate: new Date().toISOString(),
      photoIds: [],
      progressLogs: [],
      changeLogs: [],
      archived: false
    };
    try {
      const db = await openDatabase();
      const tx = db.transaction(stores.patients, 'readwrite');
      tx.objectStore(stores.patients).put(patient);
      await txDone(tx);
      await AuditRepository.log('CREATE_PATIENT', user, `Created patient ${patient.name}`, patient.id);
      return patient;
    } catch (error) {
      console.error('Failed to create patient:', error);
      throw new Error(`Critical repository error: could not create patient ${patient.name}.`);
    }
  }

  static async save(updated: Patient, user: string, previous?: Patient): Promise<Patient> {
    const patient = { ...updated, nameLowercase: updated.name.trim().toLowerCase() };
    if (previous) {
      patient.changeLogs = [...(previous.changeLogs ?? []), ...buildChangeLogs(previous, patient, user)];
    }
    try {
      const db = await openDatabase();
      const tx = db.transaction(stores.patients, 'readwrite');
      tx.objectStore(stores.patients).put(patient);
      await txDone(tx);
      await AuditRepository.log('UPDATE_PATIENT', user, `Updated patient ${patient.name}`, patient.id);
      return patient;
    } catch (error) {
      console.error('Failed to save patient:', error);
      throw new Error(`Critical repository error: could not save patient ${patient.name}.`);
    }
  }

  static async archive(id: string, archived: boolean, user: string): Promise<void> {
    const patient = await this.getById(id);
    if (!patient) return;
    await this.save({ ...patient, archived }, user, patient);
    await AuditRepository.log(archived ? 'ARCHIVE_PATIENT' : 'RESTORE_PATIENT', user, `${archived ? 'Archived' : 'Restored'} ${patient.name}`, id);
  }
}

function buildChangeLogs(previous: Patient, current: Patient, user: string): ChangeLog[] {
  const fields: Array<keyof Patient> = [
    'name',
    'age',
    'gender',
    'email',
    'phone',
    'dateOfBirth',
    'chiefComplaint',
    'treatmentPlan',
    'treatmentStatus',
    'startDate',
    'address',
    'clinic',
    'archived'
  ];
  return fields.flatMap((field) => {
    const oldValue = String(previous[field] ?? '');
    const newValue = String(current[field] ?? '');
    if (oldValue === newValue) return [];
    return [
      {
        id: randomId('C'),
        timestamp: new Date().toISOString(),
        author: user,
        field,
        oldValue,
        newValue,
        description: `${String(field)} changed by ${user}`
      }
    ];
  });
}
