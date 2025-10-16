import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Header from '@/components/Layout/Header';
import Footer from '@/components/Layout/Footer';
import styles from './LegalPage.module.css';

export default function MentionsLegales() {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/legal/mentions-legales.md')
      .then(response => response.text())
      .then(text => {
        setContent(text);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error loading mentions légales:', error);
        setIsLoading(false);
      });
  }, []);

  return (
    <div className={styles.pageContainer}>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <Link href="/" className={styles.backLink} data-testid="link-back-home">
            <ArrowLeft className={styles.backIcon} />
            Retour à l'accueil
          </Link>

          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p className={styles.loadingText}>Chargement...</p>
            </div>
          ) : (
            <article className={styles.article}>
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({node, ...props}) => <h1 className={styles.h1} {...props} />,
                  h2: ({node, ...props}) => <h2 className={styles.h2} {...props} />,
                  h3: ({node, ...props}) => <h3 className={styles.h3} {...props} />,
                  p: ({node, ...props}) => <p className={styles.p} {...props} />,
                  a: ({node, ...props}) => <a className={styles.a} {...props} target="_blank" rel="noopener noreferrer" />,
                  ul: ({node, ...props}) => <ul className={styles.ul} {...props} />,
                  ol: ({node, ...props}) => <ol className={styles.ol} {...props} />,
                  li: ({node, ...props}) => <li className={styles.li} {...props} />,
                  strong: ({node, ...props}) => <strong className={styles.strong} {...props} />,
                }}
              >
                {content}
              </ReactMarkdown>
            </article>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
