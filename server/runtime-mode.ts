export type RuntimeMode = 'local' | 'public-demo';
export interface RuntimeEnvironment { [key: string]: string | undefined; VERCEL?: string; HUMAN_PROFILE_MODE?: string; HUMAN_PROFILE_DATA_DIR?: string }
/** Vercel always uses demo memory, even if a stale local override is configured. */
export function runtimeMode(environment: RuntimeEnvironment): RuntimeMode {
 if (environment.VERCEL === '1') return 'public-demo';
 if (environment.HUMAN_PROFILE_MODE === 'public-demo') return 'public-demo';
 if (environment.HUMAN_PROFILE_MODE && environment.HUMAN_PROFILE_MODE !== 'local') throw new Error('Unsupported runtime mode.');
 return 'local';
}
