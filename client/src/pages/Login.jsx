import { useEffect } from 'react';
import { useLocation } from 'wouter';
import LoginForm from '@/components/Auth/LoginForm';
import Header from '@/components/Layout/Header';
import { useAuth } from '@/hooks/useAuth';

export default function Login() {
  return (
    <>
      <Header />
      <LoginForm />
    </>
  );
}
