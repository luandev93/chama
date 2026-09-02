import { FormEvent, useState } from 'react';
import { Banknote, CreditCard, ExternalLink, Search, XCircle } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/Button';

type Payment = {
  id: string;
  status?: string;
  method?: string;
  amount?: string;
  createdAt?: string;
  paymentUrl?: string;
  pixCopyPaste?: string;
  cashReceived?: string;
  changeAmount?: string;
};
const methods = ['PIX', 'PAYMENT_LINK', 'CREDIT_CARD', 'DEBIT_CARD', 'VOUCHER'] as const;
const key = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export default function PaymentsPage() {
  const [orderId, setOrderId] = useState('');
  const [method, setMethod] = useState<(typeof methods)[number]>('PIX');
  const [email, setEmail] = useState('');
  const [received, setReceived] = useState('');
  const [items, setItems] = useState<Payment[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Payment | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!orderId.trim()) return;
    setLoading(true);
    setError('');
    try {
      setItems(await api<Payment[]>(`/payments/orders/${encodeURIComponent(orderId.trim())}/all`));
    } catch (err) {
      setItems([]);
      setError(err instanceof ApiError ? err.message : 'Erro ao consultar pagamentos');
    } finally {
      setLoading(false);
    }
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!orderId.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const idempotencyKey = key();
      const payment =
        method === 'PIX' || method === 'PAYMENT_LINK' || method === 'CREDIT_CARD' || method === 'DEBIT_CARD' || method === 'VOUCHER'
          ? await api<Payment>(`/payments/orders/${encodeURIComponent(orderId.trim())}`, {
              method: 'POST',
              body: JSON.stringify({ method, idempotencyKey, payerEmail: email || undefined }),
            })
          : null;
      if (payment) {
        setResult(payment);
        setItems((prev) => [payment, ...prev]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao iniciar pagamento');
    } finally {
      setLoading(false);
    }
  }

  async function cash(e: FormEvent) {
    e.preventDefault();
    if (!orderId.trim() || !received.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const payment = await api<Payment>(`/payments/orders/${encodeURIComponent(orderId.trim())}/cash`, {
        method: 'POST',
        body: JSON.stringify({ receivedAmount: received.trim(), idempotencyKey: key() }),
      });
      setResult(payment);
      setItems((prev) => [payment, ...prev]);
      setReceived('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao registrar pagamento em dinheiro');
    } finally {
      setLoading(false);
    }
  }

  async function cancelPayment(id: string) {
    setLoading(true);
    setError('');
    try {
      const updated = await api<Payment>(`/payments/${id}/cancel`, { method: 'POST' });
      setItems((prev) => prev.map((p) => (p.id === id ? updated : p)));
      if (result?.id === id) setResult(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao cancelar pagamento');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page">
      <header>
        <h1>Pagamentos</h1>
        <p>Pagamento aprovado confirma o pedido e baixa o estoque pelo fluxo transacional do backend.</p>
      </header>

      <form className="card stack" onSubmit={create}>
        <h2>Iniciar cobrança</h2>
        <input className="input" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="ID do pedido" required />
        <select className="input" value={method} onChange={(e) => setMethod(e.target.value as (typeof methods)[number])}>
          {methods.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        {method === 'PIX' && <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail do pagador" required />}
        <Button icon={CreditCard} type="submit" description="Gerar a cobrança para este pedido" disabled={loading}>
          {loading ? 'Processando...' : 'Gerar cobrança'}
        </Button>
      </form>

      <form className="card stack" onSubmit={cash}>
        <h2>Pagamento em dinheiro</h2>
        <input className="input" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="ID do pedido" required />
        <input className="input" inputMode="decimal" value={received} onChange={(e) => setReceived(e.target.value)} placeholder="Valor recebido. Ex.: 50.00" required />
        <Button icon={Banknote} type="submit" description="Confirmar o recebimento em dinheiro deste pedido" disabled={loading}>
          {loading ? 'Processando...' : 'Confirmar dinheiro'}
        </Button>
      </form>

      <form className="card stack" onSubmit={submit}>
        <h2>Consultar pagamentos</h2>
        <input className="input" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="ID do pedido" required />
        <Button icon={Search} type="submit" variant="secondary" description="Ver os pagamentos deste pedido" disabled={loading}>
          Consultar
        </Button>
      </form>

      {error && (
        <div className="card" role="alert">
          {error}
        </div>
      )}

      {result && (
        <article className="card">
          <h2>Resultado</h2>
          <p>
            Status: <strong>{result.status || '—'}</strong>
          </p>
          {result.pixCopyPaste && (
            <>
              <p>PIX copia e cola</p>
              <textarea className="input" readOnly value={result.pixCopyPaste} />
            </>
          )}
          {result.paymentUrl && (
            <Button icon={ExternalLink} href={result.paymentUrl} target="_blank" rel="noreferrer" description="Abrir a página de pagamento em uma nova aba">
              Abrir pagamento
            </Button>
          )}
          {result.cashReceived && <p>Recebido: {result.cashReceived}</p>}
          {result.changeAmount && <p>Troco: {result.changeAmount}</p>}
        </article>
      )}

      {items.length > 0 && (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Método</th>
                <th>Status</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.method || '—'}</td>
                  <td>{p.status || '—'}</td>
                  <td>{p.amount || '—'}</td>
                  <td>
                    {['CREATED', 'PENDING'].includes(p.status || '') && (
                      <Button icon={XCircle} variant="secondary" description="Cancelar este pagamento" disabled={loading} onClick={() => void cancelPayment(p.id)}>
                        Cancelar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
