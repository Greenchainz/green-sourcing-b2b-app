// frontend/src/lib/intercom.ts
import { User } from '../types/auth';

declare global {
    interface Window {
        Intercom: any;
        intercomSettings?: any;
    }
}

interface IntercomConfig {
    appId: string;
    enabled: boolean;
}

let intercomLoaded = false;

/**
 * Load Intercom script
 */
export function loadIntercom(appId: string): void {
    if (intercomLoaded) return;

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://widget.intercom.io/widget/${appId}`;
    document.body.appendChild(script);

    // Intercom initialization
    (function () {
        const w = window as any;
        const ic = w.Intercom;
        if (typeof ic === 'function') {
            ic('reattach_activator');
            ic('update', w.intercomSettings);
        } else {
            const d = document;
            const i: any = function () {
                i.c(arguments);
            };
            i.q = [];
            i.c = function (args: any) {
                i.q.push(args);
            };
            w.Intercom = i;
            const l = function () {
                const s = d.createElement('script');
                s.type = 'text/javascript';
                s.async = true;
                s.src = `https://widget.intercom.io/widget/${appId}`;
                const x = d.getElementsByTagName('script')[0];
                x.parentNode!.insertBefore(s, x);
            };
            if (document.readyState === 'complete') {
                l();
            } else if (w.attachEvent) {
                w.attachEvent('onload', l);
            } else {
                w.addEventListener('load', l, false);
            }
        }
    })();

    intercomLoaded = true;
}

/**
 * Boot Intercom with authenticated user
 */
export async function bootIntercom(user: User): Promise<void> {
    try {
        // Get identity hash from backend
        const response = await fetch('/api/v1/intercom/identity-hash', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            console.error('Failed to get Intercom identity hash');
            return;
        }

        const { userHash, appId } = await response.json();

        // Load Intercom if not already loaded
        if (!intercomLoaded) {
            loadIntercom(appId);
        }

        // Boot with user data
        window.Intercom('boot', {
            app_id: appId,
            user_id: user.id || user.sub,
            email: user.email,
            name: user.name || user.email,
            user_hash: userHash, // Secure identity verification
            created_at: user.createdAt ? Math.floor(new Date(user.createdAt).getTime() / 1000) : undefined,
            company: user.companyName ? {
                id: user.companyId,
                name: user.companyName
            } : undefined
        });
    } catch (error) {
        console.error('Error booting Intercom:', error);
    }
}

/**
 * Update Intercom user data
 */
export function updateIntercom(data: Partial<User>): void {
    if (typeof window.Intercom === 'function') {
        window.Intercom('update', data);
    }
}

/**
 * Shutdown Intercom (on logout)
 */
export function shutdownIntercom(): void {
    if (typeof window.Intercom === 'function') {
        window.Intercom('shutdown');
    }
}
