import { createRoot } from 'react-dom/client';
import './components';
import App from './App';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('root element missing');

createRoot(root).render(<App />);
