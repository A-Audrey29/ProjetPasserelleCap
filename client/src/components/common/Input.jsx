import styles from './Input.module.css';

export function Input({ 
  className = '',
  type = 'text',
  disabled = false,
  ...props 
}) {
  const inputClasses = `${styles.input} ${className}`.trim();

  return (
    <input
      type={type}
      className={inputClasses}
      disabled={disabled}
      {...props}
    />
  );
}