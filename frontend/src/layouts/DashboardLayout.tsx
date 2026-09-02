import { NavLink, Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/Button';
import { Logo } from '@/components/Logo';

const links: Array<[string, string]> = [
  ['/dashboard', 'Visão geral'],
  ['/dashboard/pos', 'PDV'],
  ['/dashboard/products', 'Produtos'],
  ['/dashboard/categories', 'Categorias'],
  ['/dashboard/sections', 'Seções'],
  ['/dashboard/brands', 'Marcas'],
  ['/dashboard/stock', 'Estoque'],
  ['/dashboard/promotions', 'Promoções'],
  ['/dashboard/orders', 'Pedidos'],
  ['/dashboard/payments', 'Pagamentos'],
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <Logo /> CHAMA
        </div>
        <div>{user?.displayName}</div>
        <nav className="nav">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/dashboard'}>
              {label}
            </NavLink>
          ))}
        </nav>
        <Button icon={LogOut} variant="secondary" description="Encerrar a sessão atual" onClick={() => void logout()}>
          Sair
        </Button>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
