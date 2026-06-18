import { idbRequest, openDatabase, txDone } from '../db/connection';
import { stores } from '../db/schema';
import type { Appointment } from '../types';
import { randomId } from '../services/crypto.service';
import { logAppError } from '../services/error.service';
import { AuditRepository } from './audit.repository';

export class AppointmentRepository {
  static async listByDate(date: string): Promise<Appointment[]> {
    try {
      const db = await openDatabase();
      const tx = db.transaction(stores.appointments, 'readonly');
      return idbRequest(tx.objectStore(stores.appointments).index('date').getAll(date)) as Promise<Appointment[]>;
    } catch (error) {
      logAppError('AppointmentRepository.listByDate', error);
      return [];
    }
  }

  static async listRange(startDate: string, endDate: string): Promise<Appointment[]> {
    try {
      const db = await openDatabase();
      const tx = db.transaction(stores.appointments, 'readonly');
      const range = IDBKeyRange.bound(startDate, endDate);
      return idbRequest(tx.objectStore(stores.appointments).index('date').getAll(range)) as Promise<Appointment[]>;
    } catch (error) {
      logAppError('AppointmentRepository.listRange', error);
      return [];
    }
  }

  static async create(input: Omit<Appointment, 'id'>, user: string): Promise<Appointment> {
    const appointment = { ...input, id: randomId('A') };
    try {
      const db = await openDatabase();
      const tx = db.transaction(stores.appointments, 'readwrite');
      tx.objectStore(stores.appointments).put(appointment);
      await txDone(tx);
      await AuditRepository.log('CREATE_APPOINTMENT', user, `Booked ${appointment.patientName} at ${appointment.timeStart}`, appointment.patientId);
      return appointment;
    } catch (error) {
      logAppError('AppointmentRepository.create', error);
      throw error;
    }
  }
}
