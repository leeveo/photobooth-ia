import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/photobooth-ia/admin/');
  return null;
}
