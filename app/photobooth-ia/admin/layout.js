// Layout serveur simplifié qui utilise le wrapper client
import AdminLayoutClient from './components/AdminLayoutClient';

export default function AdminLayout({ children }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}