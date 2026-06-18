import { Navigate, Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { OnboardingPage } from './features/onboarding/OnboardingPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { PatientsPage } from './features/patients/PatientsPage';
import { PatientProfilePage } from './features/patients/PatientProfilePage';
import { SchedulePage } from './features/appointments/SchedulePage';
import { AdminPage } from './features/backups/AdminPage';
import { useSession } from './hooks/useSession';
import { BackupService } from './services/backup.service';

export default function App() {
  const session = useSession();
  const doctorName = session.profile?.doctorName ?? 'Doctor';

  useEffect(() => {
    // Android Native Enhancements
    const setupNative = async () => {
      try {
        const corePkg = '@capacitor/core';
        const { Capacitor } = await import(/* @vite-ignore */ corePkg);
        if (Capacitor.isNativePlatform()) {
          // 1. Back button exit confirmation
          const appPkg = '@capacitor/app';
          const { App: NativeApp } = await import(/* @vite-ignore */ appPkg);
          
          // Remove existing listeners to avoid duplicates
          await NativeApp.removeAllListeners();
          
          await NativeApp.addListener('backButton', async () => {
            const path = window.location.pathname;
            if (path === '/' || path === '/dashboard') {
              if (confirm('Are you sure you want to exit OrthoTrackr?')) {
                NativeApp.exitApp();
              }
            } else {
              window.history.back();
            }
          });

          // 2. Immersive mode (Hide Status Bar & Navigation Bar)
          const sbPkg = '@capacitor/status-bar';
          const { StatusBar } = await import(/* @vite-ignore */ sbPkg);
          await StatusBar.hide();

          const nbPkg = '@capgo/capacitor-navigation-bar';
          const { NavigationBar } = await import(/* @vite-ignore */ nbPkg);
          // @capgo/capacitor-navigation-bar v6 uses .hide() for immersive
          await NavigationBar.hide();
        }
      } catch (e) {
        console.warn('Native setup failed', e);
      }
    };

    setupNative();
  }, [session.isUnlocked, session.profile?.doctorName]);

  if (session.needsSetup) return <OnboardingPage onSetup={session.setup} />;

  return (
    <AppShell profile={session.profile}>
      <Routes>
        <Route path="/" element={<DashboardPage doctorName={doctorName} />} />
        <Route path="/patients" element={<PatientsPage doctorName={doctorName} />} />
        <Route path="/patients/:id" element={<PatientProfilePage doctorName={doctorName} />} />
        <Route path="/schedule" element={<SchedulePage doctorName={doctorName} />} />
        <Route path="/admin" element={<AdminPage doctorName={doctorName} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
