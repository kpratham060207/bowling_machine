import { redirect } from 'next/navigation';

/** Legacy profile route — redirects to the player app profile page. */
export default function LegacyProfileRedirect() {
  redirect('/app/profile');
}
