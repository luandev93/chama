import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

type Brand = { id: string; name: string; productsCount: number; salesVolume: number; revenue: number };
const money = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));

export default function BrandsPage() {
  const [items, setItems] = useState<Brand[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Brand[]>('/brands')
      .then(setItems)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Erro ao carregar marcas'));
  }, []);

  return (
    <section className="page">
      <header>
        <h1>Marcas</h1>
        <p>Acompanhe o desempenho comercial por marca nos últimos 30 dias.</p>
      </header>

      {error ? (
        <div className="card" role="alert">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="card">Nenhuma marca cadastrada.</div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Marca</th>
                <th>Produtos</th>
                <th>Unidades vendidas</th>
                <th>Faturamento</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id}>
                  <td>
                    <strong>{b.name}</strong>
                  </td>
                  <td>{b.productsCount}</td>
                  <td>{b.salesVolume}</td>
                  <td>{money(b.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
