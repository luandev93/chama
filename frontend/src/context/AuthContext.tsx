import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type User={id:string;name:string;email:string;role:string};
type AuthContextValue={user:User|null;loading:boolean;login:(email:string,password:string)=>Promise<void>;logout:()=>void};
const AuthContext=createContext<AuthContextValue|undefined>(undefined);
const API=import.meta.env.VITE_API_URL||'http://localhost:3000';
export function AuthProvider({children}:{children:ReactNode}){const [user,setUser]=useState<User|null>(null);const [loading,setLoading]=useState(true);useEffect(()=>{const raw=sessionStorage.getItem('chama.user');if(raw)setUser(JSON.parse(raw));setLoading(false)},[]);const value=useMemo(()=>({user,loading,async login(email:string,password:string){const res=await fetch(`${API}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});if(!res.ok)throw new Error('Não foi possível iniciar a sessão');const data=await res.json();const next=data.user||{id:'session',name:email.split('@')[0],email,role:'owner'};setUser(next);sessionStorage.setItem('chama.user',JSON.stringify(next));},logout(){setUser(null);sessionStorage.removeItem('chama.user')}}),[user,loading]);return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>}
export function useAuth(){const value=useContext(AuthContext);if(!value)throw new Error('useAuth deve ser usado dentro de AuthProvider');return value}
