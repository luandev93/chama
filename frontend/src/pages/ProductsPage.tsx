import { useEffect, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/Button';

type Product = { id: string; name: string; gtin?: string; costPrice?: number; salePrice?: number; effectivePrice?: number; category?: { name: string }; section?: { name: string } };
const money = (value?: number) => (value == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value));

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(query = q) {
    setLoading(true);
    setError('');
    try {
      const data = await api<Product[]>(`/catalog/products${query ? `?q=${encodeURIComponent(query)}` : ''}`);
      setItems(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Não foi possível carregar produtos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const focus = params.get('productId');
    if (focus) {
      setQ(focus);
      void load(focus);
    } else void load('');
  }, []);

  return (
    <section className="page">
      <header>
        <h1>Produtos</h1>
        <p>Catálogo, preço e regras comerciais vêm do backend.</p>
      </header>

      <form
        className="card stack"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto" />
        <Button icon={Search} type="submit" description="Buscar produtos pelo nome ou código">
          Buscar
        </Button>
      </form>

      {loading ? (
        <div className="card">Carregando produtos...</div>
      ) : error ? (
        <div className="card" role="alert">
          {error}
          <div style={{ marginTop: 12 }}>
            <Button icon={RefreshCw} description="Tentar carregar os produtos novamente" onClick={() => void load()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="card">Nenhum produto encontrado.</div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>GTIN</th>
                <th>Categoria</th>
                <th>Seção</th>
                <th>Custo</th>
                <th>Venda</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.gtin || '—'}</td>
                  <td>{p.category?.name || '—'}</td>
                  <td>{p.section?.name || '—'}</td>
                  <td>{money(p.costPrice)}</td>
                  <td>{money(p.effectivePrice ?? p.salePrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
