import { FormEvent, useEffect, useState } from 'react';
import { Plus, Search, ShoppingCart, XCircle } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/Button';

type Order = { id: string; status?: string; origin?: string; customerName?: string };
type Product = { id: string; name: string; effectivePrice?: number; salePrice?: number };
type Item = { productId: string; quantity: string };
const origins = ['POS', 'WHATSAPP', 'CATALOG', 'MANUAL'];

export default function OrdersPage() {
  const [order, setOrder] = useState<Order | null>(null);
  const [orderId, setOrderId] = useState('');
  const [origin, setOrigin] = useState('POS');
  const [items, setItems] = useState<Item[]>([{ productId: '', quantity: '1' }]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void api<Product[]>('/catalog/products').then(setProducts).catch(() => undefined);
  }, []);

  async function load(e: FormEvent) {
    e.preventDefault();
    if (!orderId.trim()) return;
    setLoading(true);
    setError('');
    try {
      setOrder(await api<Order>(`/orders/${encodeURIComponent(orderId.trim())}`));
    } catch (err) {
      setOrder(null);
      setError(err instanceof ApiError ? err.message : 'Erro ao consultar pedido');
    } finally {
      setLoading(false);
    }
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    const clean = items.filter((i) => i.productId.trim());
    if (!clean.length) return;
    setLoading(true);
    setError('');
    try {
      const data = await api<Order>('/orders', {
        method: 'POST',
        body: JSON.stringify({ origin, customerName: customerName || undefined, items: clean.map((i) => ({ productId: i.productId.trim(), quantity: i.quantity })) }),
      });
      setOrder(data);
      setOrderId(data.id);
      setItems([{ productId: '', quantity: '1' }]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar pedido');
    } finally {
      setLoading(false);
    }
  }

  async function cancel() {
    if (!order?.id) return;
    setLoading(true);
    setError('');
    try {
      setOrder(await api<Order>(`/orders/${order.id}/cancel`, { method: 'POST' }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao cancelar pedido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page">
      <header>
        <h1>Pedidos</h1>
        <p>Criação, consulta e cancelamento passam pelo backend e pelo contexto da loja.</p>
      </header>

      <form className="card stack" onSubmit={create}>
        <h2>Novo pedido</h2>
        <select className="input" value={origin} onChange={(e) => setOrigin(e.target.value)}>
          {origins.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <input className="input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Cliente (opcional)" />
        {items.map((item, index) => (
          <div className="grid" key={index}>
            <select
              className="input"
              value={item.productId}
              onChange={(e) => setItems((prev) => prev.map((x, i) => (i === index ? { ...x, productId: e.target.value } : x)))}
              required
            >
              <option value="">Selecione o produto</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              className="input"
              type="number"
              min="0.001"
              step="0.001"
              value={item.quantity}
              onChange={(e) => setItems((prev) => prev.map((x, i) => (i === index ? { ...x, quantity: e.target.value } : x)))}
              placeholder="Quantidade"
              required
            />
          </div>
        ))}
        <Button
          icon={Plus}
          type="button"
          variant="secondary"
          description="Adicionar mais um produto a este pedido"
          onClick={() => setItems((prev) => [...prev, { productId: '', quantity: '1' }])}
        >
          Adicionar item
        </Button>
        <Button icon={ShoppingCart} type="submit" description="Criar este pedido" disabled={loading}>
          {loading ? 'Processando...' : 'Criar pedido'}
        </Button>
      </form>

      <form className="card stack" onSubmit={load}>
        <h2>Consultar pedido</h2>
        <input className="input" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="ID do pedido" />
        <Button icon={Search} type="submit" variant="secondary" description="Buscar este pedido pelo ID" disabled={loading}>
          Consultar
        </Button>
      </form>

      {error && (
        <div className="card" role="alert">
          {error}
        </div>
      )}

      {order && (
        <article className="card">
          <h2>Pedido {order.id}</h2>
          <div className="grid">
            <div>
              <small>Status</small>
              <h3>{order.status || '—'}</h3>
            </div>
            <div>
              <small>Origem</small>
              <h3>{order.origin || '—'}</h3>
            </div>
            <div>
              <small>Cliente</small>
              <h3>{order.customerName || '—'}</h3>
            </div>
          </div>
          <Button icon={XCircle} variant="secondary" description="Cancelar este pedido" disabled={loading} onClick={() => void cancel()}>
            Cancelar pedido
          </Button>
        </article>
      )}
    </section>
  );
}
