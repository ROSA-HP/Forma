import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {SplashOverlay} from './components/SplashOverlay.tsx';

createRoot(document.getElementById('root')!).render(
  <>
    <SplashOverlay />
    <App />
  </>
);
