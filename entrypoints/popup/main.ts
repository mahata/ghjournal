import './style.css';

import { renderPopup } from '@/lib/popup';

const app = document.querySelector<HTMLElement>('#app');
if (app) void renderPopup(app);
