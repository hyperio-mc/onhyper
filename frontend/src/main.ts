import './app.css';
import App from './App.svelte';
import { initRouter } from './router';

// Initialize the router
initRouter();

// Create and mount the app
const app = new App({
	target: document.getElementById('app')!
});

export default app;