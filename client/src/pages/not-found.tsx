import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F5F6F7'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '28rem',
        margin: '0 1rem',
        backgroundColor: '#FFFFFF',
        border: '1px solid #D1D5DB',
        borderRadius: '8px',
        padding: '1.5rem',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{
          display: 'flex',
          marginBottom: '1rem',
          gap: '0.5rem',
          alignItems: 'center'
        }}>
          <AlertCircle style={{ 
            height: '2rem', 
            width: '2rem', 
            color: '#8C4A4A' 
          }} />
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#404040',
            fontFamily: 'var(--font-titles)'
          }}>
            404 Page Not Found
          </h1>
        </div>

        <p style={{
          marginTop: '1rem',
          fontSize: '0.875rem',
          color: '#6B7280'
        }}>
          Did you forget to add the page to the router?
        </p>
      </div>
    </div>
  );
}