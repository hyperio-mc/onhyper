import { writable } from 'svelte/store';
import { browser } from '../environment';
import { identifyUser, resetUser, trackSignup, trackLogin } from '../analytics';

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
		login: (user: User, token: string, options?: { isNewUser?: boolean }) => {
			const auth = { user, token };
			if (browser) {
				localStorage.setItem('auth', JSON.stringify(auth));
			}
			set(auth);
			
			// Identify user in PostHog
			identifyUser(user.id, {
				email: user.email,
				plan: user.plan,
			});
			
			// Track login event (only if not a new signup)
			if (!options?.isNewUser) {
				trackLogin({ email: user.email });
			}
		},
		signup: (user: User, token: string, source?: string) => {
			const auth = { user, token };
			if (browser) {
				localStorage.setItem('auth', JSON.stringify(auth));
			}
			set(auth);
			
			// Identify user in PostHog
			identifyUser(user.id, {
				email: user.email,
				plan: user.plan,
			});
			
			// Track signup event
			trackSignup({
				email: user.email,
				plan: user.plan,
				source: source || 'organic',
			});
		},
		logout: () => {
			if (browser) {
				localStorage.removeItem('auth');
			}
			set({ user: null, token: null });
			
			// Reset PostHog user identity
			resetUser();
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