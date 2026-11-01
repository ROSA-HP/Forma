import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// The launch splash is static markup in index.html so it paints before this bundle loads
createRoot(document.getElementById('root')!).render(<App />);
