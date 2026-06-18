export type TreatmentStatus = 'active' | 'retention' | 'completed' | 'draft';
export type AppointmentStatus = 'Arrived' | 'Confirmed' | 'Pending' | 'Urgent';

export interface Patient {
  id: string;
  name: string;
  nameLowercase: string;
  age?: number | null;
  gender?: string;
  email: string;
  phone: string;
  registrationDate: string;
  dateOfBirth: string;
  chiefComplaint: string;
  treatmentPlan: string;
  treatmentStatus: TreatmentStatus;
  startDate: string;
  address?: string;
  clinic?: string;
  archived?: boolean;
  photoIds: string[];
  progressLogs: ProgressLog[];
  changeLogs: ChangeLog[];
}

export interface ProgressLog {
  id: string;
  date: string;
  title: string;
  notes: string;
  photoIds: string[];
}

export interface ChangeLog {
  id: string;
  timestamp: string;
  author: string;
  field: keyof Patient | string;
  oldValue: string;
  newValue: string;
  description: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientStatus: string;
  timeStart: string;
  timeEnd: string;
  date: string;
  location: string;
  status: AppointmentStatus;
}

export interface BackupHistoryLog {
  id: string;
  dateTime: string;
  action: string;
  initiatedBy: string;
  status: 'COMPLETED' | 'FAILED';
  fileSize: string;
  backupData?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  patientId?: string;
  user: string;
  details: string;
  prevHash: string;
  selfHash: string;
}

export interface AuditMeta {
  id: 'head';
  lastHash: string;
  lastAuditId?: string;
}

export interface PhotoMetadata {
  id: string;
  patientId: string;
  label: string;
  mimeType: string;
  size: number;
  dateCaptured: string;
}

export interface PhotoBlobRecord {
  id: string;
  blob: Blob;
}

export interface DoctorProfile {
  doctorName: string;
  clinicName?: string;
  lockTimer?: number;
}

export interface BackupPayload {
  exportDate: string;
  schemaVersion: number;
  patients: Patient[];
  appointments: Appointment[];
  backupLogs: BackupHistoryLog[];
  auditLogs: AuditLog[];
  photoMetadata: PhotoMetadata[];
  photoBlobs?: { id: string; base64: string; mimeType: string }[];
}
