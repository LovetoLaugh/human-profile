import type { CSSProperties } from 'react';
const paths: Record<string, string> = {
 home: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
 people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
 profile: 'M20 21a8 8 0 0 0-16 0M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
 shield: 'M12 3 3 7v5c0 5 9 10 9 10s9-5 9-10V7zM8 12l3 3 5-6',
 share: 'M8 12h8M12 8l4 4-4 4M9 4H4v16h5M15 4h5v16h-5',
 check: 'm5 12 4 4L19 6',
 community: 'M3 21h18M5 21V10h14v11M3 10l9-7 9 7M9 21v-6h6v6',
 growth: 'M4 19 10 13l4 3 6-11M14 5h6v6',
 settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z',
 search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
 bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
 leaf: 'M20 3C7 2 2 8 5 15c7 7 16 1 15-12ZM4 21 15 10',
 bolt: 'm13 2-9 12h7l-1 8 10-13h-7z',
 focus: 'M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
 wallet: 'M20 7H4V4h14v3M4 7v13h17V7zM21 12h-6v4h6',
 sun: 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M12 1v2M12 21v2M1 12h2M21 12h2M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2',
 arrow: 'M4 12h16m-5-5 5 5-5 5',
 lock: 'M5 10h14v11H5zM8 10V6a4 4 0 0 1 8 0v4',
 book: 'M12 5v16M12 5C9 2 4 3 2 4v15c4-2 7-1 10 2 3-3 6-4 10-2V4c-2-1-7-2-10 1',
 heart: 'M20 4c-3-3-7-1-8 2-1-3-5-5-8-2-5 5 1 11 8 16 7-5 13-11 8-16',
 moon: 'M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10',
 chevron: 'm9 5 7 7-7 7',
};
export function Icon({ name, size = 20, style }: { name: string; size?: number; style?: CSSProperties }) {
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={paths[name] || paths.profile} /></svg>;
}
