import { writable } from 'svelte/store';

export interface App {
	id: string;
	name: string;
	slug: string;
	html: string;
	css: string;
	js: string;
	createdAt: string;
	updatedAt: string;
}

function createAppsStore() {
	const { subscribe, set, update } = writable<App[]>([]);

	return {
		subscribe,
		set,
		add: (app: App) => {
			update(apps => [...apps, app]);
		},
		update: (id: string, data: Partial<App>) => {
			update(apps => apps.map(a => a.id === id ? { ...a, ...data } : a));
		},
		remove: (id: string) => {
			update(apps => apps.filter(a => a.id !== id));
		},
		clear: () => set([])
	};
}

export const apps = createAppsStore();