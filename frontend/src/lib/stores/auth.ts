import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface User {
	id: string;
	email: string;
	plan: 'FREE' | 'HOBBY' | 'PRO' | 'BUSINESS';
	createdAt: string;
}

function createAuthStore() {
	const stored = browser ? localStorage.getItem('auth') : null;
	const initial = stored ? JSON.parse(stored) : { user: null, token: null };
	
	const { subscribe, set, update } = writable<{
		user: User | null;
		token: string | null;
	}>(initial);

	return {
		subscribe,
		login: (user: User, token: string) => {
			const auth = { user, token };
			if (browser) {
				localStorage.setItem('auth', JSON.stringify(auth));
			}
			set(auth);
		},
		logout: () => {
			if (browser) {
				localStorage.removeItem('auth');
			}
			set({ user: null, token: null });
		},
		updateUser: (user: Partial<User>) => {
			update(auth => {
				if (auth.user) {
					const updated = { ...auth.user, ...user };
					if (browser) {
						localStorage.setItem('auth', JSON.stringify({ ...auth, user: updated }));
					}
					return { ...auth, user: updated };
				}
				return auth;
			});
		}
	};
}

export const auth = createAuthStore();