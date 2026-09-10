export const profileTabs = ['Overview', 'Timeline', 'Evidence', 'About', 'Permissions'] as const;
export type ProfileTab = typeof profileTabs[number];
export function ProfileTabs({ active, onChange }: { active: ProfileTab; onChange: (tab: ProfileTab) => void }) {
 return <div className="profile-tabs" role="tablist" aria-label="Profile sections">{profileTabs.map((tab, index) => <button key={tab} id={`tab-${tab}`} role="tab" aria-selected={active === tab} aria-controls={`panel-${tab}`} tabIndex={active === tab ? 0 : -1} onClick={() => onChange(tab)} onKeyDown={event => {
  let next = index;
  if (event.key === 'ArrowRight') next = (index + 1) % profileTabs.length;
  else if (event.key === 'ArrowLeft') next = (index + profileTabs.length - 1) % profileTabs.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = profileTabs.length - 1;
  else return;
  event.preventDefault(); onChange(profileTabs[next]); document.getElementById(`tab-${profileTabs[next]}`)?.focus();
 }}>{tab}</button>)}</div>;
}
