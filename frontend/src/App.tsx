import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/layouts/ProtectedRoute';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import ProductsPage from '@/pages/ProductsPage';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/products" element={<ProductsPage />} />
          <Route path="/dashboard/categories" element={<div className="p-8">Página de Categorias em desenvolvimento</div>} />
          <Route path="/dashboard/sections" element={<div className="p-8">Página de Seções em desenvolvimento</div>} />
          <Route path="/dashboard/brands" element={<div className="p-8">Página de Marcas em desenvolvimento</div>} />
          <Route path="/dashboard/stock" element={<div className="p-8">Página de Estoque em desenvolvimento</div>} />
          <Route path="/dashboard/promotions" element={<div className="p-8">Página de Promoções em desenvolvimento</div>} />
          <Route path="/dashboard/orders" element={<div className="p-8">Página de Pedidos em desenvolvimento</div>} />
          <Route path="/dashboard/payments" element={<div className="p-8">Página de Pagamentos em desenvolvimento</div>} />
        </Route>

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
