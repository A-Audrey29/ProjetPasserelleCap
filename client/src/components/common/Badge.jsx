import styles from './Badge.module.css';

export function Badge({ 
  children, 
  variant = 'default',
  className = '',
  ...props 
}) {
  const baseClass = styles.badge;
  const variantClass = styles[`badge${variant.charAt(0).toUpperCase() + variant.slice(1)}`] || styles.badgeDefault;
  
  const badgeClasses = `${baseClass} ${variantClass} ${className}`.trim();

  return (
    <span
      className={badgeClasses}
      {...props}
    >
      {children}
    </span>
  );
}