import { CalendarClock, FilePlus2, UsersRound, Clock, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { PatientRepository } from '../../repositories/patient.repository';
import { AppointmentRepository } from '../../repositories/appointment.repository';
import { formatDate } from '../../utils/date';
import type { Patient, Appointment } from '../../types';

export function DashboardPage({ doctorName }: { doctorName: string }) {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'recent' | 'pending'>('upcoming');
  const patientCount = useQuery({ queryKey: ['patient-count'], queryFn: () => PatientRepository.count() });

  const upcomingAppointments = useQuery({
    queryKey: ['upcoming-appointments'],
    queryFn: async () => {
      const start = new Date();
      const end = new Date();
      end.setDate(start.getDate() + 7);
      return AppointmentRepository.listRange(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10));
    }
  });

  const recentTimeline = useQuery({
    queryKey: ['recent-timeline'],
    queryFn: async () => {
      const patients = await PatientRepository.query({ limit: 1000 });
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const entries: Array<{ patientName: string; patientId: string; date: string; title: string; notes: string }> = [];
      patients.forEach(p => {
        p.progressLogs.forEach(log => {
          if (new Date(log.date) >= oneWeekAgo) {
            entries.push({ patientName: p.name, patientId: p.id, ...log });
          }
        });
      });
      return entries.sort((a, b) => b.date.localeCompare(a.date));
    }
  });

  const pendingReviews = useQuery({
    queryKey: ['pending-reviews'],
    queryFn: async () => {
      const patients = await PatientRepository.query({ limit: 1000 });
      const twentyFiveDaysAgo = new Date();
      twentyFiveDaysAgo.setDate(twentyFiveDaysAgo.getDate() - 25);
      return patients.filter(p => {
        const lastLog = p.progressLogs[0]; // Assuming progressLogs are sorted desc or latest is first
        if (!lastLog) return false;
        return new Date(lastLog.date) < twentyFiveDaysAgo;
      });
    }
  });

  return (
    <section className="page-stack">
      <div className="hero-panel">
        <p className="eyebrow">Welcome Dr.</p>
        <h2>{doctorName}</h2>
        <p>Privacy focused offline patient database </p>
      </div>

      <div className="metric-grid">
        <Link to="/patients" className="metric-card">
          <UsersRound />
          <strong>{patientCount.data ?? 0}</strong>
          <span>Patient records</span>
        </Link>
        <Link to="/patients" className="metric-card">
          <FilePlus2 />
          <strong>New</strong>
          <span>Register case</span>
        </Link>
      </div>

      <div className="tab-container">
        <div className="tab-header">
          <button className={activeTab === 'upcoming' ? 'active' : ''} onClick={() => setActiveTab('upcoming')}>Upcoming</button>
          <button className={activeTab === 'recent' ? 'active' : ''} onClick={() => setActiveTab('recent')}>Recent</button>
          <button className={activeTab === 'pending' ? 'active' : ''} onClick={() => setActiveTab('pending')}>Pending</button>
        </div>

        <div className="tab-content">
          {activeTab === 'upcoming' && (
            <div className="list-stack">
              {upcomingAppointments.data?.map((appt: Appointment) => (
                <div key={appt.id} className="list-item">
                  <div className="list-item-main">
                    <strong>{appt.patientName}</strong>
                    <span>{formatDate(appt.date)} at {appt.timeStart}</span>
                  </div>
                </div>
              ))}
              {upcomingAppointments.data?.length === 0 && <p className="empty-state">No upcoming appointments for the next week.</p>}
            </div>
          )}

          {activeTab === 'recent' && (
            <div className="list-stack">
              {recentTimeline.data?.map((entry, idx) => (
                <div key={idx} className="list-item">
                  <div className="list-item-main">
                    <strong>{entry.patientName}</strong>
                    <span>{entry.title} - {formatDate(entry.date)}</span>
                    <p>{entry.notes}</p>
                  </div>
                </div>
              ))}
              {recentTimeline.data?.length === 0 && <p className="empty-state">No timeline entries from the past week.</p>}
            </div>
          )}

          {activeTab === 'pending' && (
            <div className="list-stack">
              {pendingReviews.data?.map((p: Patient) => (
                <div key={p.id} className="list-item">
                  <div className="list-item-main">
                    <strong>{p.name}</strong>
                    <span>Last follow up: {p.progressLogs[0] ? formatDate(p.progressLogs[0].date) : 'Never'}</span>
                  </div>
                </div>
              ))}
              {pendingReviews.data?.length === 0 && <p className="empty-state">No patients pending review.</p>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
