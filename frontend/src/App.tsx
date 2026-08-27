import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/layouts/ProtectedRoute';
import DashboardLayout from '@/layouts/DashboardLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import ProductsPage from '@/pages/ProductsPage';

const Placeholder=({title}:{title:string})=><section className="page"><h1>{title}</h1><div className="card">Módulo em implementação. Nenhuma regra comercial é simulada localmente.</div></section>;
function App(){return <AuthProvider><Routes><Route path="/login" element={<LoginPage/>}/><Route element={<ProtectedRoute/>}><Route path="/dashboard" element={<DashboardLayout/>}><Route index element={<DashboardPage/>}/><Route path="products" element={<ProductsPage/>}/><Route path="categories" element={<Placeholder title="Categorias"/>}/><Route path="sections" element={<Placeholder title="Seções"/>}/><Route path="brands" element={<Placeholder title="Marcas"/>}/><Route path="stock" element={<Placeholder title="Estoque"/>}/><Route path="promotions" element={<Placeholder title="Promoções"/>}/><Route path="orders" element={<Placeholder title="Pedidos"/>}/><Route path="payments" element={<Placeholder title="Pagamentos"/>}/></Route></Route><Route path="/" element={<Navigate to="/dashboard" replace/>}/><Route path="*" element={<Navigate to="/dashboard" replace/>}/></Routes></AuthProvider>}
export default App;
