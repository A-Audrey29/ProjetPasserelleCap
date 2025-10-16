import { useEffect } from 'react';
import { useLocation } from 'wouter';
import LoginForm from '@/components/Auth/LoginForm';
import Header from '@/components/Layout/Header';
import Footer from '@/components/Layout/Footer';
import { useAuth } from '@/hooks/useAuth';

export default function Login() {
  return (
    <>
      <Header />
      <LoginForm />
      <Footer />
    </>
  );
}
