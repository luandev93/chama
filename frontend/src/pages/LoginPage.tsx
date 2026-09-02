import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/Button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      nav('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center">
      <form className="card stack" onSubmit={submit} style={{ width: 'min(420px,100%)' }}>
        <div>
          <div className="brand">
            <Logo size={36} /> CHAMA
          </div>
          <h1>Entrar</h1>
        </div>
        <label>
          E-mail
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Senha
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <div role="alert">{error}</div>}
        <Button icon={LogIn} type="submit" description="Entrar com o e-mail e senha informados" disabled={busy}>
          {busy ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
    </div>
  );
}
