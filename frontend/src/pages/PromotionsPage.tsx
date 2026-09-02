import { FormEvent, useEffect, useState } from 'react';
import { Flame, Pause, Play, Tag, TrendingUp } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/Button';

type Product = { id: string; name: string; pricing?: { basePrice?: string | number } };
type Promotion = {
  id: string;
  title: string;
  productName?: string;
  basePrice?: string | number;
  promotionPrice?: string | number;
  percentOff?: string | number;
  status: string;
  startsAt: string;
  endsAt?: string;
};
type Suggestion = {
  productId: string;
  productName: string;
  lotId: string;
  lotCode: string;
  expiresAt: string;
  daysToExpire: number;
  lotQuantity: string | number;
  basePrice: string | number | null;
  suggestedDiscountPercent: number;
  suggestedPrice: number | null;
  reason: string;
};
type CommercialSuggestion = {
  productId: string;
  productName: string;
  availableQuantity: number;
  salesLast30Days: number;
  estimatedStockDays: number | null;
  suggestedDiscountPercent: number;
  suggestedPrice: number | null;
  reason: string;
};

const money = (v: unknown) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));

export default function PromotionsPage() {
  const [items, setItems] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [commercial, setCommercial] = useState<CommercialSuggestion[]>([]);
  const [productId, setProductId] = useState('');
  const [title, setTitle] = useState('');
  const [promotionPrice, setPromotionPrice] = useState('');
  const [percentOff, setPercentOff] = useState('');
  const [startsAt, setStartsAt] = useState(new Date().toISOString().slice(0, 16));
  const [endsAt, setEndsAt] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [promos, prods, sugs, slow] = await Promise.all([
        api<Promotion[]>('/promotions'),
        api<Product[]>('/catalog/products'),
        api<Suggestion[]>('/inventory/promotion-suggestions'),
        api<CommercialSuggestion[]>('/promotions/commercial-suggestions'),
      ]);
      setItems(promos);
      setProducts(prods);
      setSuggestions(sugs);
      setCommercial(slow);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Não foi possível carregar promoções');
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

  async function create(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api('/promotions', {
        method: 'POST',
        body: JSON.stringify({
          productId,
          title: title || undefined,
          promotionalPrice: promotionPrice || undefined,
          percentOff: promotionPrice ? undefined : percentOff || undefined,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
          status: 'ACTIVE',
        }),
      });
      setProductId('');
      setTitle('');
      setPromotionPrice('');
      setPercentOff('');
      setEndsAt('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar promoção');
    } finally {
      setLoading(false);
    }
  }

  async function applySuggestion(s: Suggestion) {
    setLoading(true);
    setError('');
    try {
      await api('/promotions', {
        method: 'POST',
        body: JSON.stringify({
          productId: s.productId,
          lotId: s.lotId,
          title: `Oferta de validade: ${s.productName}`,
          promotionalPrice: s.suggestedPrice,
          percentOff: s.suggestedPrice ? undefined : s.suggestedDiscountPercent,
          startsAt: new Date().toISOString(),
          endsAt: s.expiresAt,
          status: 'ACTIVE',
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível aplicar sugestão');
    } finally {
      setLoading(false);
    }
  }

  async function applyCommercial(s: CommercialSuggestion) {
    setLoading(true);
    setError('');
    try {
      await api('/promotions', {
        method: 'POST',
        body: JSON.stringify({
          productId: s.productId,
          title: `Oferta para girar estoque: ${s.productName}`,
          promotionalPrice: s.suggestedPrice,
          percentOff: s.suggestedPrice ? undefined : s.suggestedDiscountPercent,
          startsAt: new Date().toISOString(),
          status: 'ACTIVE',
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível aplicar sugestão comercial');
    } finally {
      setLoading(false);
    }
  }

  async function status(id: string, status: string) {
    setLoading(true);
    setError('');
    try {
      await api(`/promotions/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível atualizar promoção');
    } finally {
      setLoading(false);
    }
  }

  const selected = products.find((p) => p.id === productId);

  return (
    <section className="page">
      <header>
        <h1>Promoções</h1>
        <p>Ofertas reais, sugestões por validade, estoque parado e aprovação do gestor em poucos passos.</p>
      </header>

      {suggestions.length > 0 && (
        <section className="card">
          <h2>🔥 Risco de vencimento</h2>
          <p>Produtos com risco de perda. A promoção não é aplicada sem sua aprovação.</p>
          <table className="table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Lote</th>
                <th>Vence em</th>
                <th>Estoque</th>
                <th>Preço sugerido</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((s) => (
                <tr key={s.lotId}>
                  <td>
                    <strong>{s.productName}</strong>
                    <br />
                    {s.reason}
                  </td>
                  <td>{s.lotCode}</td>
                  <td>{s.daysToExpire} dias</td>
                  <td>{s.lotQuantity}</td>
                  <td>
                    {s.basePrice != null && <s>{money(s.basePrice)}</s>}
                    <br />
                    <strong>{s.suggestedPrice ? money(s.suggestedPrice) : `${s.suggestedDiscountPercent}% OFF`}</strong>
                  </td>
                  <td>
                    <Button icon={Flame} description="Criar esta promoção por vencimento" disabled={loading} onClick={() => void applySuggestion(s)}>
                      Aplicar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {commercial.length > 0 && (
        <section className="card">
          <h2>📈 Estoque parado / excesso</h2>
          <p>Produtos com baixa saída nos últimos 30 dias e oportunidade de acelerar o giro.</p>
          <table className="table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Disponível</th>
                <th>Vendas 30d</th>
                <th>Cobertura</th>
                <th>Oferta sugerida</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {commercial.map((s) => (
                <tr key={s.productId}>
                  <td>
                    <strong>{s.productName}</strong>
                    <br />
                    {s.reason}
                  </td>
                  <td>{s.availableQuantity}</td>
                  <td>{s.salesLast30Days}</td>
                  <td>{s.estimatedStockDays == null ? 'Sem giro' : `${s.estimatedStockDays} dias`}</td>
                  <td>
                    <strong>{s.suggestedPrice ? money(s.suggestedPrice) : `${s.suggestedDiscountPercent}% OFF`}</strong>
                  </td>
                  <td>
                    <Button icon={TrendingUp} description="Criar uma oferta para acelerar o giro deste produto" disabled={loading} onClick={() => void applyCommercial(s)}>
                      Criar oferta
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <form className="card stack" onSubmit={create}>
        <h2>Nova promoção</h2>
        <select className="input" value={productId} onChange={(e) => setProductId(e.target.value)} required>
          <option value="">Selecione o produto</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {selected && (
          <p>
            Preço atual: <strong>{money(selected.pricing?.basePrice)}</strong>
          </p>
        )}
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome da oferta (opcional)" />
        <div className="grid">
          <input
            className="input"
            inputMode="decimal"
            value={promotionPrice}
            onChange={(e) => {
              setPromotionPrice(e.target.value);
              if (e.target.value) setPercentOff('');
            }}
            placeholder="Preço promocional"
          />
          <input
            className="input"
            inputMode="decimal"
            value={percentOff}
            disabled={Boolean(promotionPrice)}
            onChange={(e) => setPercentOff(e.target.value)}
            placeholder="ou desconto (%)"
          />
        </div>
        <div className="grid">
          <input className="input" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
          <input className="input" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </div>
        <Button icon={Tag} type="submit" description="Ativar esta promoção no catálogo" disabled={loading || !productId || (!promotionPrice && !percentOff)}>
          {loading ? 'Salvando...' : 'Ativar promoção'}
        </Button>
      </form>

      {error && (
        <div className="card" role="alert">
          {error}
        </div>
      )}

      <div className="card">
        <h2>Promoções cadastradas</h2>
        {items.length === 0 ? (
          <p>Nenhuma promoção cadastrada.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Normal</th>
                <th>Oferta</th>
                <th>Status</th>
                <th>Período</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>{p.productName || p.title}</td>
                  <td>{money(p.basePrice)}</td>
                  <td>{p.promotionPrice ? money(p.promotionPrice) : `${p.percentOff}% OFF`}</td>
                  <td>{p.status}</td>
                  <td>
                    {new Date(p.startsAt).toLocaleString('pt-BR')}
                    {p.endsAt ? ` → ${new Date(p.endsAt).toLocaleString('pt-BR')}` : ''}
                  </td>
                  <td>
                    {p.status === 'ACTIVE' ? (
                      <Button icon={Pause} variant="secondary" description="Pausar esta promoção" disabled={loading} onClick={() => void status(p.id, 'PAUSED')}>
                        Pausar
                      </Button>
                    ) : (
                      <Button icon={Play} variant="secondary" description="Reativar esta promoção" disabled={loading} onClick={() => void status(p.id, 'ACTIVE')}>
                        Ativar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
