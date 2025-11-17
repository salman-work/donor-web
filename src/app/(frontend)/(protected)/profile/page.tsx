import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Profile',
}

export default function ProfileIndexPage() {
  // Redirect to the default profile sub-page
  redirect('/profile/personal')
}
