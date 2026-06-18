import { Archive, Plus, Search } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usePatientMutations, usePatientQuery } from '../../hooks/usePatients';
import { PhotoRepository } from '../../repositories/photo.repository';
import type { Patient, TreatmentStatus } from '../../types';
import { todayInput } from '../../utils/date';

export function PatientsPage({ doctorName }: { doctorName: string }) {
  const [search, setSearch] = useState('');
  const [archived, setArchived] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [viewByClinic, setViewByClinic] = useState(false);
  const patients = usePatientQuery(search, archived);
  const mutations = usePatientMutations(doctorName);
  
  const sortedPatients = useMemo(() => {
    return [...(patients.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  }, [patients.data]);

  const grouped = useMemo(() => {
    if (viewByClinic) {
      return groupPatientsByClinic(sortedPatients);
    }
    return groupPatientsByAlpha(sortedPatients);
  }, [sortedPatients, viewByClinic]);

  async function create(input: NewPatientInput) {
    await mutations.createPatient.mutateAsync(input);
    setShowForm(false);
  }

  return (
    <section className="page-stack">
      <div className="section-header">
        <div>
          <p className="eyebrow">Clinical directory</p>
          <h2>Patients</h2>
        </div>
        <button className="primary-icon-button" onClick={() => setShowForm((value) => !value)} title="Add patient">
          <Plus size={20} />
        </button>
      </div>

      <div className="search-row">
        <Search size={18} />
        <input placeholder="Search name, phone, email, ID, clinic" value={search} onChange={(event) => setSearch(event.target.value)} />
        <button className={archived ? 'chip active' : 'chip'} onClick={() => setArchived((value) => !value)}>
          <Archive size={16} />
          Archive
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 1rem', marginBottom: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={viewByClinic} onChange={(e) => setViewByClinic(e.target.checked)} />
          View By Clinics
        </label>
      </div>

      {showForm && <PatientForm onCreate={create} isSaving={mutations.createPatient.isPending} />}

      <div className="patient-list">
        {Object.entries(grouped).map(([letter, list]) => (
          <div className="alpha-group" key={letter}>
            <div className="alpha-title">{letter}</div>
            {list.map((patient) => (
              <Link className="patient-row" key={patient.id} to={`/patients/${patient.id}`}>
                <PatientAvatar patient={patient} />
                <div>
                  <strong>{patient.name}</strong>
                  <span>{patient.age ? `${patient.age}y` : 'No age'} · {patient.clinic || 'No clinic'} · {patient.phone || 'No phone'}</span>
                </div>
              </Link>
            ))}
          </div>
        ))}
        {!patients.isLoading && !patients.data?.length && <p className="empty-state">No matching records in this vault.</p>}
      </div>
    </section>
  );
}

type NewPatientInput = Omit<Patient, 'id' | 'nameLowercase' | 'registrationDate' | 'photoIds' | 'progressLogs' | 'changeLogs'>;

function PatientForm({ onCreate, isSaving }: { onCreate: (input: NewPatientInput) => Promise<void>; isSaving: boolean }) {
  const [form, setForm] = useState<NewPatientInput>({
    name: '',
    age: null,
    gender: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    chiefComplaint: '',
    treatmentPlan: '',
    treatmentStatus: 'active',
    startDate: todayInput(),
    address: '',
    clinic: '',
    archived: false
  });

  function update<K extends keyof NewPatientInput>(key: K, value: NewPatientInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onCreate({ ...form, name: form.name.trim(), age: form.age ? Number(form.age) : null });
  }

  return (
    <form className="clinical-form" onSubmit={submit}>
      <label>Full name<input required value={form.name} onChange={(event) => update('name', event.target.value)} /></label>
      <div className="two-col">
        <label>Age<input type="number" min={1} max={120} value={form.age ?? ''} onChange={(event) => update('age', event.target.value ? Number(event.target.value) : null)} /></label>
        <label>Starting Date (dd-mm-yyyy)<input type="date" value={form.startDate} onChange={(event) => update('startDate', event.target.value)} /></label>
      </div>
      <div className="two-col">
        <label>Phone<input value={form.phone} onChange={(event) => update('phone', event.target.value)} /></label>
        <label>Email<input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} /></label>
      </div>
      <label>Clinic<input value={form.clinic} onChange={(event) => update('clinic', event.target.value)} /></label>
      <label>Chief complaint<textarea value={form.chiefComplaint} onChange={(event) => update('chiefComplaint', event.target.value)} /></label>
      <label>Treatment plan<textarea value={form.treatmentPlan} onChange={(event) => update('treatmentPlan', event.target.value)} /></label>
      <button className="primary-button" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save patient'}</button>
    </form>
  );
}

function PatientAvatar({ patient }: { patient: Patient }) {
  const profilePhotoId = patient.photoIds.find(id => id.startsWith('PROFILE_')) || patient.photoIds[0];
  const photo = useQuery({ 
    queryKey: ['photo-blob', profilePhotoId], 
    queryFn: () => profilePhotoId ? PhotoRepository.getBlob(profilePhotoId.replace('PROFILE_', '')) : null,
    enabled: !!profilePhotoId
  });
  const url = photo.data ? URL.createObjectURL(photo.data) : '';

  if (url) {
    return <div className="avatar" style={{ background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}><img src={url} alt={patient.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }} /></div>;
  }

  return <div className="avatar">{patient.name.slice(0, 1).toUpperCase()}</div>;
}

function groupPatientsByAlpha(patients: Patient[]): Record<string, Patient[]> {
  return patients.reduce<Record<string, Patient[]>>((groups, patient) => {
    const key = patient.name.slice(0, 1).toUpperCase() || '#';
    groups[key] = [...(groups[key] ?? []), patient];
    return groups;
  }, {});
}

function groupPatientsByClinic(patients: Patient[]): Record<string, Patient[]> {
  const groups: Record<string, Patient[]> = {};
  
  // First, group by clinic
  patients.forEach(patient => {
    const key = patient.clinic || 'Unassigned';
    if (!groups[key]) groups[key] = [];
    groups[key].push(patient);
  });

  // Sort clinic names alphabetically, but keep 'Unassigned' at the end if desired
  // Or just sort all.
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    return a.localeCompare(b);
  });

  const sortedGroups: Record<string, Patient[]> = {};
  sortedKeys.forEach(key => {
    sortedGroups[key] = groups[key];
  });

  return sortedGroups;
}
