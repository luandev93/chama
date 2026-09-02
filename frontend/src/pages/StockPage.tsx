import { FormEvent, useEffect, useState } from 'react';
import { PackagePlus, RefreshCw } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/Button';

type Alert = { productId: string; productName?: string; type?: string; message?: string; severity?: string };
type MovementType = 'PURCHASE' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'LOSS' | 'EXPIRATION' | 'RETURN' | 'INVENTORY_CORRECTION';
const types: MovementType[] = ['PURCHASE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'LOSS', 'EXPIRATION', 'RETURN', 'INVENTORY_CORRECTION'];

export default function StockPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [type, setType] = useState<MovementType>('PURCHASE');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setAlerts(await api<Alert[]>('/inventory/alerts'));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Não foi possível carregar alertas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const focus = params.get('productId');
    if (focus) setProductId(focus);
    void load();
  }, []);

  async function move(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api('/inventory/movements', { method: 'POST', body: JSON.stringify({ productId, type, quantity, reason: reason || undefined }) });
      setQuantity('');
      setReason('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível registrar movimentação');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page">
      <header>
        <h1>Estoque</h1>
        <p>Movimentações são validadas e gravadas pelo backend.</p>
      </header>

      <form className="card stack" onSubmit={move}>
        <h2>Movimentação manual</h2>
        <input className="input" value={productId} onChange={(e) => setProductId(e.target.value)} placeholder="ID do produto" required />
        <select className="input" value={type} onChange={(e) => setType(e.target.value as MovementType)}>
          {types.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <input className="input" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Quantidade" required />
        <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (opcional)" maxLength={500} />
        <Button icon={PackagePlus} type="submit" description="Registrar esta movimentação de estoque" disabled={saving}>
          {saving ? 'Registrando...' : 'Registrar movimentação'}
        </Button>
      </form>

      {loading ? (
        <div className="card">Carregando alertas...</div>
      ) : error ? (
        <div className="card" role="alert">
          {error}
          <div style={{ marginTop: 12 }}>
            <Button icon={RefreshCw} description="Tentar carregar os alertas de estoque novamente" onClick={() => void load()}>
              Atualizar
            </Button>
          </div>
        </div>
      ) : alerts.length === 0 ? (
        <div className="card">Nenhum alerta de estoque no momento.</div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Tipo</th>
                <th>Mensagem</th>
                <th>Prioridade</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a, i) => (
                <tr key={`${a.productId}-${i}`}>
                  <td>{a.productName || a.productId}</td>
                  <td>{a.type || '—'}</td>
                  <td>{a.message || '—'}</td>
                  <td>{a.severity || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
