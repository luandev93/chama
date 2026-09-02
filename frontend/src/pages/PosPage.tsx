import { useEffect, useMemo, useRef, useState } from 'react';
import { CreditCard, ExternalLink, RotateCcw, Search, ShoppingCart } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/Button';

type Promotion = { promotionalPrice?: number; percentOff?: number };
type Product = {
  id: string;
  name: string;
  gtin?: string;
  pricing?: { basePrice?: number; effectivePrice?: number; isOffer?: boolean; promotion?: Promotion };
  effectivePrice?: number;
  salePrice?: number;
};
type CartItem = { product: Product; quantity: number };
type Order = { id: string; status?: string };
type Payment = { id: string; status?: string; method?: string; pixCopyPaste?: string; paymentUrl?: string; changeAmount?: string };

const money = (v?: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));
const price = (p: Product) => Number(p.pricing?.effectivePrice ?? p.effectivePrice ?? p.salePrice ?? 0);
const idKey = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export default function PosPage() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [method, setMethod] = useState<'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH'>('PIX');
  const [received, setReceived] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const total = useMemo(() => cart.reduce((s, i) => s + i.quantity * price(i.product), 0), [cart]);

  useEffect(() => {
    input.current?.focus();
  }, []);

  async function search() {
    const term = q.trim();
    if (!term) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await api<Product[]>(`/catalog/products?q=${encodeURIComponent(term)}`);
      if (data.length === 1 && data[0].gtin === term) {
        add(data[0]);
        return;
      }
      setResults(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Não foi possível buscar produtos');
    } finally {
      setLoading(false);
    }
  }

  function add(product: Product) {
    setCart((prev) => {
      const found = prev.find((i) => i.product.id === product.id);
      return found ? prev.map((i) => (i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)) : [...prev, { product, quantity: 1 }];
    });
    setQ('');
    setResults([]);
    setTimeout(() => input.current?.focus(), 0);
  }

  function qty(id: string, delta: number) {
    if (order) return;
    setCart((prev) => prev.flatMap((i) => (i.product.id === id ? (i.quantity + delta > 0 ? [{ ...i, quantity: i.quantity + delta }] : []) : [i])));
  }

  function reset() {
    setCart([]);
    setResults([]);
    setQ('');
    setOrder(null);
    setPayment(null);
    setReceived('');
    setError('');
    setTimeout(() => input.current?.focus(), 0);
  }

  async function checkout() {
    if (!cart.length) return;
    setLoading(true);
    setError('');
    setPayment(null);
    try {
      setOrder(await api<Order>('/orders', { method: 'POST', body: JSON.stringify({ origin: 'POS', items: cart.map((i) => ({ productId: i.product.id, quantity: String(i.quantity) })) }) }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Não foi possível criar a venda');
    } finally {
      setLoading(false);
    }
  }

  async function pay() {
    if (!order) return;
    setLoading(true);
    setError('');
    try {
      const p =
        method === 'CASH'
          ? await api<Payment>(`/payments/orders/${order.id}/cash`, { method: 'POST', body: JSON.stringify({ receivedAmount: received, idempotencyKey: idKey() }) })
          : await api<Payment>(`/payments/orders/${order.id}`, { method: 'POST', body: JSON.stringify({ method, idempotencyKey: idKey() }) });
      setPayment(p);
      if (method === 'CASH' && ['APPROVED', 'CONFIRMED', 'PAID'].includes(p.status || '')) setTimeout(reset, 900);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Não foi possível processar o pagamento');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page">
      <header>
        <h1>PDV</h1>
        <p>Leitor USB/Bluetooth funciona como teclado: bipe o código e pressione Enter.</p>
      </header>

      <div className="grid">
        <section className="card stack">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void search();
            }}
            className="stack"
          >
            <input ref={input} className="input" value={q} onChange={(e) => setQ(e.target.value)} disabled={Boolean(order)} placeholder="Bipe o código ou pesquise o produto" />
            <Button icon={Search} type="submit" description="Buscar produto pelo nome ou código de barras" disabled={loading || Boolean(order)}>
              Buscar
            </Button>
          </form>
          {results.map((p) => (
            <button type="button" className="card" key={p.id} onClick={() => add(p)} disabled={Boolean(order)}>
              <strong>{p.name}</strong>
              <br />
              {p.pricing?.isOffer && p.pricing.basePrice != null && (
                <>
                  <s>{money(Number(p.pricing.basePrice))}</s>
                  <br />
                </>
              )}
              {money(price(p))}
              {p.pricing?.isOffer && ' 🔥'}
            </button>
          ))}
        </section>

        <section className="card stack">
          <h2>Venda atual</h2>
          {cart.length === 0 ? (
            <p>Nenhum item.</p>
          ) : (
            cart.map((i) => (
              <div className="grid" key={i.product.id}>
                <div>
                  <strong>{i.product.name}</strong>
                  <br />
                  {i.product.pricing?.isOffer && i.product.pricing.basePrice != null && <s>{money(Number(i.product.pricing.basePrice))}</s>} {money(price(i.product))}
                </div>
                <div>
                  <button className="btn secondary" title="Diminuir quantidade" disabled={Boolean(order)} onClick={() => qty(i.product.id, -1)}>
                    -
                  </button>{' '}
                  {i.quantity}{' '}
                  <button className="btn secondary" title="Aumentar quantidade" disabled={Boolean(order)} onClick={() => qty(i.product.id, 1)}>
                    +
                  </button>
                </div>
              </div>
            ))
          )}
          <h2>Total: {money(total)}</h2>
          {!order ? (
            <Button icon={ShoppingCart} description="Reservar o estoque e seguir para o pagamento" disabled={!cart.length || loading} onClick={() => void checkout()}>
              Ir para pagamento
            </Button>
          ) : (
            <>
              <p>Pedido reservado: {order.id}</p>
              <select className="input" value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
                <option>PIX</option>
                <option>CREDIT_CARD</option>
                <option>DEBIT_CARD</option>
                <option>CASH</option>
              </select>
              {method === 'CASH' && <input className="input" inputMode="decimal" value={received} onChange={(e) => setReceived(e.target.value)} placeholder="Valor recebido" />}
              <Button icon={CreditCard} description="Confirmar o pagamento desta venda" disabled={loading || (method === 'CASH' && !received)} onClick={() => void pay()}>
                {loading ? 'Processando...' : 'Finalizar pagamento'}
              </Button>
              <Button icon={RotateCcw} variant="secondary" description="Cancelar esta venda e começar uma nova" disabled={loading} onClick={reset}>
                Nova venda
              </Button>
            </>
          )}
        </section>
      </div>

      {error && (
        <div className="card" role="alert">
          {error}
        </div>
      )}

      {payment && (
        <div className="card">
          <h2>Pagamento</h2>
          <p>{payment.status || 'Processando'}</p>
          {payment.pixCopyPaste && <textarea className="input" readOnly value={payment.pixCopyPaste} />}{' '}
          {payment.paymentUrl && (
            <Button icon={ExternalLink} href={payment.paymentUrl} target="_blank" rel="noreferrer" description="Abrir a página de pagamento em uma nova aba">
              Abrir pagamento
            </Button>
          )}{' '}
          {payment.changeAmount && <p>Troco: {payment.changeAmount}</p>}
        </div>
      )}
    </section>
  );
}
