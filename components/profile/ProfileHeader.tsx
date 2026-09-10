import type { AboutProfile, AudienceType } from '@/types/profile';
import { Icon } from '../Icon';
import { profileMetadata } from '@/data/profile-details';
export function ProfileVisibilityBadge({ audience }: { audience: AudienceType | 'me' }) {
 return <span className="profile-visibility"><Icon name={audience === 'me' ? 'lock' : 'people'} size={12}/>{audience === 'me' ? 'Only you · Full profile' : `${audience[0].toUpperCase()}${audience.slice(1)} preview`}</span>;
}
export function ProfileHeader({ profile, audience, showAbout, total, onEdit, onShare, onViewAs }: {
 profile: AboutProfile; audience: AudienceType | 'me'; showAbout: boolean; total: number;
 onEdit: () => void; onShare: () => void; onViewAs: () => void;
}) {
 return <section className="card profile-header"><div className="profile-header-top"><span className="avatar profile-avatar">{profile.name.trim().slice(0, 2).toUpperCase()}</span><div className="profile-identity"><div className="profile-name"><h1>{profile.name}</h1><ProfileVisibilityBadge audience={audience}/></div>{showAbout && <p>{profile.description}</p>}<div className="profile-meta">{audience === 'me' && <><span>Profile completeness: <strong>{profileMetadata.completeness}%</strong></span><span>Evidence items: <strong>{total}</strong></span></>}<span>Last updated: <strong>{profileMetadata.lastUpdated}</strong></span></div></div></div><div className="profile-header-bottom"><p>Your profile evolves from the information and evidence you choose to include.</p><div className="profile-actions"><button className="profile-button" onClick={onEdit} disabled={audience !== 'me'}>Edit Profile</button><button className="profile-button primary" onClick={onShare}><Icon name="share" size={14}/>Share Profile</button><button className="profile-button" onClick={onViewAs}>View As…</button></div></div></section>;
}
