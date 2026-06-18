import { ArrowLeft, Camera, Download, Save, ShieldCheck, Edit3, X, Maximize2 } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePatient, usePatientMutations } from '../../hooks/usePatients';
import { PhotoRepository } from '../../repositories/photo.repository';
import type { Patient, ProgressLog, TreatmentStatus } from '../../types';
import { randomId } from '../../services/crypto.service';
import { exportPatientPdf, saveBlob } from '../../services/pdf.service';
import { formatDate, todayInput } from '../../utils/date';

export function PatientProfilePage({ doctorName }: { doctorName: string }) {
  const { id } = useParams();
  const patientQuery = usePatient(id);
  const patient = patientQuery.data;

  if (patientQuery.isLoading) return <p className="empty-state">Loading patient...</p>;
  if (!patient) return <p className="empty-state">Patient not found.</p>;

  return <PatientProfile patient={patient} doctorName={doctorName} />;
}

function PatientProfile({ patient, doctorName }: { patient: Patient; doctorName: string }) {
  const [draft, setDraft] = useState(patient);
  const [isEditing, setIsEditing] = useState(false);
  const [logDate, setLogDate] = useState(todayInput());
  const [logNotes, setLogNotes] = useState('');
  const [logPhotos, setLogPhotos] = useState<File[]>([]);
  const queryClient = useQueryClient();
  const mutations = usePatientMutations(doctorName);
  const photoMetadata = useQuery({ queryKey: ['photos', patient.id], queryFn: () => PhotoRepository.listMetadata(patient.id) });

  function update<K extends keyof Patient>(key: K, value: Patient[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    await mutations.savePatient.mutateAsync({ patient: draft, previous: patient });
    setIsEditing(false);
  }

  async function addLog(event: FormEvent) {
    event.preventDefault();
    const logPhotoIds: string[] = [];
    for (const file of logPhotos) {
      const metadata = await PhotoRepository.addPatientPhoto(patient.id, file, file.name, doctorName);
      logPhotoIds.push(metadata.id);
    }
    const progressLog: ProgressLog = { id: randomId('L'), date: logDate, title: '', notes: logNotes, photoIds: logPhotoIds };
    await mutations.savePatient.mutateAsync({ patient: { ...patient, progressLogs: [progressLog, ...patient.progressLogs], photoIds: [...patient.photoIds, ...logPhotoIds] }, previous: patient });
    setLogNotes('');
    setLogPhotos([]);
    await queryClient.invalidateQueries({ queryKey: ['photos', patient.id] });
  }

  async function uploadPhoto(fileList: FileList | null) {
    if (!fileList?.length) return;
    for (const file of Array.from(fileList)) {
      await PhotoRepository.addPatientPhoto(patient.id, file, file.name, doctorName);
    }
    await queryClient.invalidateQueries({ queryKey: ['photos', patient.id] });
    await queryClient.invalidateQueries({ queryKey: ['patient', patient.id] });
  }

  async function downloadPdf() {
    const blob = await exportPatientPdf(patient, doctorName);
    saveBlob(`${patient.name.replace(/\s+/g, '_')}_clinical_summary.pdf`, 'application/pdf', blob);
  }

  const diffDays = (d1: string, d2: string) => {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const profilePhotoId = patient.photoIds.find(id => id.startsWith('PROFILE_')) || patient.photoIds[0];

  return (
    <section className="page-stack">
      <div className="section-header">
        <Link to="/patients" className="ghost-button"><ArrowLeft size={18} /> Back</Link>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="ghost-button" onClick={() => setIsEditing(!isEditing)}><Edit3 size={18} /> {isEditing ? 'Cancel' : 'Edit'}</button>
          <button className="ghost-button" onClick={downloadPdf}><Download size={18} /> PDF</button>
        </div>
      </div>

      <div className="profile-hero">
        <PatientAvatar patient={patient} large />
        <div>
          <p className="eyebrow">{patient.id}</p>
          <h2>{patient.name}</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
             <span className={`status ${patient.treatmentStatus}`}>{patient.treatmentStatus}</span>
             {patient.clinic && <span className="status active">{patient.clinic}</span>}
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="clinical-form">
          <div className="two-col">
            <label>Name<input value={draft.name} onChange={(event) => update('name', event.target.value)} /></label>
            <label>Status<select value={draft.treatmentStatus} onChange={(event) => update('treatmentStatus', event.target.value as TreatmentStatus)}><option value="active">Active</option><option value="completed">Completed</option></select></label>
          </div>
          <div className="two-col">
            <label>Age<input type="number" value={draft.age ?? ''} onChange={(event) => update('age', event.target.value ? Number(event.target.value) : null)} /></label>
            <label>Phone<input value={draft.phone} onChange={(event) => update('phone', event.target.value)} /></label>
          </div>
          <div className="two-col">
            <label>Email<input value={draft.email} onChange={(event) => update('email', event.target.value)} /></label>
            <label>Clinic<input value={draft.clinic || ''} onChange={(event) => update('clinic', event.target.value)} /></label>
          </div>
          <label>Chief complaint<textarea value={draft.chiefComplaint} onChange={(event) => update('chiefComplaint', event.target.value)} /></label>
          <label>Treatment plan<textarea value={draft.treatmentPlan} onChange={(event) => update('treatmentPlan', event.target.value)} /></label>
          <button className="primary-button" onClick={save}><Save size={18} /> Save details</button>
        </div>
      )}

      <div className="panel">
        <div className="section-header compact">
          <h3>Clinical photos</h3>
          <label className="ghost-button file-button"><Camera size={18} /> Add<input multiple type="file" accept="image/*" onChange={(event) => uploadPhoto(event.target.files)} /></label>
        </div>
        <div className="photo-scroller">
          {(photoMetadata.data ?? []).map((photo) => (
            <PhotoTile 
              key={photo.id} 
              id={photo.id} 
              label={photo.label} 
              isProfile={profilePhotoId === `PROFILE_${photo.id}` || (profilePhotoId === photo.id)}
              onSetProfile={async () => {
                const newPhotoIds = patient.photoIds.filter(id => !id.startsWith('PROFILE_'));
                await mutations.savePatient.mutateAsync({ patient: { ...patient, photoIds: [`PROFILE_${photo.id}`, ...newPhotoIds] }, previous: patient });
              }}
            />
          ))}
          {!photoMetadata.data?.length && <p className="empty-state">No photos yet.</p>}
        </div>
      </div>

      <form className="clinical-form" onSubmit={addLog}>
        <h3>Follow Up</h3>
        <div className="two-col">
          <label>Date<input type="date" value={logDate} onChange={(event) => setLogDate(event.target.value)} /></label>
          <label className="ghost-button file-button"><Camera size={18} /> Photos ({logPhotos.length})<input multiple type="file" accept="image/*" onChange={(event) => setLogPhotos(Array.from(event.target.files || []))} /></label>
        </div>
        <label>Clinical notes<textarea required value={logNotes} onChange={(event) => setLogNotes(event.target.value)} /></label>
        <button className="primary-button" type="submit">Add follow up</button>
      </form>

      <div className="panel">
        <h3>Treatment timeline</h3>
        {patient.progressLogs.map((log) => (
          <article className="timeline-item" key={log.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
               <small>{formatDate(log.date)}</small>
               <small>Day {diffDays(patient.startDate, log.date)}</small>
            </div>
            <p>{log.notes}</p>
            {log.photoIds.length > 0 && (
              <div className="photo-scroller" style={{ marginTop: '8px' }}>
                {log.photoIds.map(id => <PhotoTile key={id} id={id} label="" hideActions />)}
              </div>
            )}
          </article>
        ))}
      </div>

      <div className="panel">
        <h3><ShieldCheck size={18} /> Profile changelog</h3>
        {patient.changeLogs.map((log) => (
          <article className="audit-row" key={log.id}>
            <strong>{String(log.field)}</strong>
            <span>{log.oldValue || 'empty'} → {log.newValue || 'empty'}</span>
            <small>{formatDate(log.timestamp)} · {log.author}</small>
          </article>
        ))}
        {!patient.changeLogs.length && <p className="empty-state">No profile changes recorded yet.</p>}
      </div>
    </section>
  );
}

function PhotoTile({ id, label, isProfile, onSetProfile, hideActions }: { id: string; label: string; isProfile?: boolean; onSetProfile?: () => void; hideActions?: boolean }) {
  const [zoomed, setZoomed] = useState(false);
  const photo = useQuery({ queryKey: ['photo-blob', id], queryFn: () => PhotoRepository.getBlob(id) });
  const url = photo.data ? URL.createObjectURL(photo.data) : '';

  return (
    <>
      <figure className={`photo-tile ${isProfile ? 'profile-active' : ''}`} style={{ minWidth: '150px' }}>
        <div style={{ position: 'relative' }}>
          {url && <img src={url} alt={label} onClick={() => setZoomed(true)} style={{ cursor: 'zoom-in' }} />}
          {!hideActions && (
            <button 
              className="zoom-trigger" 
              onClick={(e) => { e.preventDefault(); setZoomed(true); }}
              style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 0, borderRadius: '4px', padding: '4px' }}
            >
              <Maximize2 size={14} />
            </button>
          )}
        </div>
        {!hideActions && (
          <figcaption>
            <button 
              className={`chip ${isProfile ? 'active' : ''}`} 
              onClick={onSetProfile}
              style={{ fontSize: '0.65rem', width: '100%', minHeight: '24px' }}
            >
              {isProfile ? 'Profile Photo' : 'Set Profile'}
            </button>
          </figcaption>
        )}
      </figure>

      {zoomed && url && (
        <div className="photo-modal" onClick={() => setZoomed(false)}>
          <button className="close-modal"><X size={24} /></button>
          <img src={url} alt="Zoomed" />
        </div>
      )}
    </>
  );
}

function PatientAvatar({ patient, large }: { patient: Patient; large?: boolean }) {
  const profilePhotoId = patient.photoIds.find(id => id.startsWith('PROFILE_')) || patient.photoIds[0];
  const photo = useQuery({ 
    queryKey: ['photo-blob', profilePhotoId], 
    queryFn: () => profilePhotoId ? PhotoRepository.getBlob(profilePhotoId.replace('PROFILE_', '')) : null,
    enabled: !!profilePhotoId
  });
  const url = photo.data ? URL.createObjectURL(photo.data) : '';

  if (url) {
    return <div className={`avatar ${large ? 'large' : ''}`} style={{ background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}><img src={url} alt={patient.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }} /></div>;
  }

  return <div className={`avatar ${large ? 'large' : ''}`}>{patient.name.slice(0, 1).toUpperCase()}</div>;
}
