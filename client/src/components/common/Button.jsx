import styles from './Button.module.css';

export function Button({ 
  children, 
  variant = 'primary',
  size = 'default',
  disabled = false,
  className = '',
  onClick,
  type = 'button',
  ...props 
}) {
  const baseClass = styles.button;
  const variantClass = variant === 'outline' ? styles.buttonOutline : styles.buttonPrimary;
  const sizeClass = size === 'sm' ? styles.buttonSmall : styles.buttonDefault;
  
  const buttonClasses = `${baseClass} ${variantClass} ${sizeClass} ${className}`.trim();

  return (
    <button
      type={type}
      className={buttonClasses}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}