import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { useAppointmentMutations, useMonthAppointments } from '../../hooks/useAppointments';
import { formatDate } from '../../utils/date';
import { usePatientQuery } from '../../hooks/usePatients';
import type { AppointmentStatus, Patient } from '../../types';
import { todayInput } from '../../utils/date';

export function SchedulePage({ doctorName }: { doctorName: string }) {
  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(todayInput());
  const appointments = useMonthAppointments(month);
  const byDate = useMemo(() => {
    const groups = new Map<string, number>();
    appointments.data?.forEach((appt) => groups.set(appt.date, (groups.get(appt.date) ?? 0) + 1));
    return groups;
  }, [appointments.data]);

  function shiftMonth(delta: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  return (
    <section className="page-stack">
      <div className="section-header">
        <button className="icon-button" onClick={() => shiftMonth(-1)}><ChevronLeft /></button>
        <div className="center-title">
          <p className="eyebrow">Chair planner</p>
          <h2>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
        </div>
        <button className="icon-button" onClick={() => shiftMonth(1)}><ChevronRight /></button>
      </div>

      <div className="calendar-grid">
        {buildCalendar(month).map((day) => (
          <button key={day.date} className={day.date === selectedDate ? 'day-cell active' : 'day-cell'} onClick={() => setSelectedDate(day.date)}>
            <span>{day.label}</span>
            {!!byDate.get(day.date) && <small>{byDate.get(day.date)} appt</small>}
          </button>
        ))}
      </div>

      <div className="panel">
        <h3>Appointments for {formatDate(selectedDate)}</h3>
        <div className="list-stack">
          {(appointments.data ?? []).filter(a => a.date === selectedDate).map(appt => (
            <div key={appt.id} className="list-item">
              <div className="list-item-main">
                <strong>{appt.patientName}</strong>
                <span><Clock size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> {appt.timeStart} - {appt.timeEnd}</span>
                {appt.patientStatus && <p>{appt.patientStatus}</p>}
              </div>
            </div>
          ))}
          {!(appointments.data ?? []).some(a => a.date === selectedDate) && <p className="empty-state">No appointments booked for this day.</p>}
        </div>
      </div>

      <BookingPanel doctorName={doctorName} selectedDate={selectedDate} />
    </section>
  );
}

function BookingPanel({ doctorName, selectedDate }: { doctorName: string; selectedDate: string }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Patient | null>(null);
  const [timeStart, setTimeStart] = useState('09:00');
  const [timeEnd, setTimeEnd] = useState('09:30');
  const [notes, setNotes] = useState('Orthodontic review');
  const patients = usePatientQuery(search, false);
  const mutations = useAppointmentMutations(doctorName);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    await mutations.createAppointment.mutateAsync({
      patientId: selected.id,
      patientName: selected.name,
      patientStatus: notes,
      timeStart,
      timeEnd,
      date: selectedDate,
      location: '',
      status: 'Confirmed'
    });
    setSelected(null);
    setSearch('');
  }

  return (
    <form className="clinical-form" onSubmit={submit}>
      <h3><Plus size={18} /> Book {selectedDate}</h3>
      <label>Patient search<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Type patient name" /></label>
      {search && !selected && (
        <div className="suggest-list">
          {(patients.data ?? []).slice(0, 6).map((patient) => (
            <button type="button" key={patient.id} onClick={() => { setSelected(patient); setSearch(patient.name); }}>
              {patient.name}<span>{patient.phone}</span>
            </button>
          ))}
        </div>
      )}
      <div className="two-col">
        <label>Start<input type="time" value={timeStart} onChange={(event) => setTimeStart(event.target.value)} /></label>
        <label>End<input type="time" value={timeEnd} onChange={(event) => setTimeEnd(event.target.value)} /></label>
      </div>
      <label>Notes<input value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      <button className="primary-button" disabled={!selected || mutations.createAppointment.isPending}>Book appointment</button>
    </form>
  );
}

function buildCalendar(month: Date): Array<{ date: string; label: number }> {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const days: Array<{ date: string; label: number }> = [];
  for (let day = 1; day <= end.getDate(); day += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), day);
    const year = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    days.push({ date: `${year}-${m}-${d}`, label: day });
  }
  return days;
}
