import { writable } from 'svelte/store';

export interface Secret {
	id: string;
	name: string;
	maskedValue: string;
	createdAt: string;
}

function createSecretsStore() {
	const { subscribe, set, update } = writable<Secret[]>([]);

	return {
		subscribe,
		set,
		add: (secret: Secret) => {
			update(secrets => [...secrets, secret]);
		},
		remove: (id: string) => {
			update(secrets => secrets.filter(s => s.id !== id));
		},
		clear: () => set([])
	};
}

export const secrets = createSecretsStore();