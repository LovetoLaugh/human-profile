import { Dashboard } from '@/components/Dashboard';
import { DemoIntroduction } from '@/components/DemoIntroduction';
import { ProfileDataBoundary } from '@/components/commitments/CommitmentProvider';

export default function Home() {
 return <><div className="home-introduction"><DemoIntroduction /></div><ProfileDataBoundary><Dashboard /></ProfileDataBoundary></>;
}
