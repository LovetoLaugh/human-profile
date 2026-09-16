import Link from 'next/link';

/** Static content also rendered in the initial HTML while the profile loads. */
export function DemoIntroduction() {
 return <section className="card demo-introduction" aria-labelledby="demo-title">
  <span className="eyebrow">Interactive prototype · Fictional demo data</span>
  <h1 id="demo-title">Human Profile</h1>
  <p className="demo-tagline">People. Context. Trust.</p>
  <p>Understand human context through evidence, patterns, and purpose-based sharing.</p>
  <div className="profile-actions"><Link className="profile-button primary" href="/profile">Explore Demo Profile</Link><Link className="profile-button" href="/sign-in" prefetch={false}>Continue with Google</Link></div>
  <div id="how-it-works"><h2>Actions → Evidence → Patterns → Profile</h2>
   <p>Derived behavioral patterns are backed by inspectable evidence rather than an opaque human score. Other prototype indicators are illustrative.</p>
   <p><strong>Try this:</strong> <Link href="/commitments">Create a commitment</Link>, complete it, and inspect its evidence. Explore View As and Permissions in My Profile.</p>
   <small>Fictional profile data · Simulated external verification · No real health or wearable integrations. Public demo state is temporary and isolated; changes may reset.</small>
  </div>
 </section>;
}
