import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './Select.module.css';

export function Select({ value, onValueChange, children }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.selectContainer}>
      {children}
    </div>
  );
}

export function SelectTrigger({ className = '', children, ...props }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <button
      type="button"
      className={`${styles.selectTrigger} ${className}`.trim()}
      onClick={() => setIsOpen(!isOpen)}
      {...props}
    >
      {children}
      <ChevronDown className={styles.chevronIcon} />
    </button>
  );
}

export function SelectValue({ placeholder }) {
  return <span className={styles.selectValue}>{placeholder}</span>;
}

export function SelectContent({ children }) {
  return (
    <div className={styles.selectContent}>
      {children}
    </div>
  );
}

export function SelectItem({ value, children, onClick }) {
  return (
    <div 
      className={styles.selectItem}
      onClick={onClick}
    >
      {children}
    </div>
  );
}