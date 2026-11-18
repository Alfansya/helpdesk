import AuthProvider from '@/components/AuthProvider';

export default function AdminLayout({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
