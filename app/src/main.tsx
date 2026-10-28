import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { SoundProvider } from './audio/SoundProvider';
import { LanguageProvider } from './i18n/LanguageProvider';
import { scormDriver } from './tracking/scorm';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

const render = () =>
  createRoot(container).render(
    <StrictMode>
      <LanguageProvider>
        <SoundProvider>
          <App />
        </SoundProvider>
      </LanguageProvider>
    </StrictMode>,
  );

// In the SCORM package the driver must not be initialised before `load`, and
// the app initialises it as it mounts — so inside an LMS, mount after `load`.
if (scormDriver() && document.readyState !== 'complete') window.addEventListener('load', render, { once: true });
else render();
