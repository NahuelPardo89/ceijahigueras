import { useAuth } from '../hooks/useAuth';
import { DashboardLayout } from './admin/DashboardLayout';

export const Dashboard = () => {
  const { user } = useAuth();
  if (!user) return null;
  return <DashboardLayout />;
};
