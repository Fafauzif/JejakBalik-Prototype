import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import * as PrimitiveDialog from '@radix-ui/react-dialog';
import { X, LoaderCircle, ArrowRight } from 'lucide-react';
import { useLocale } from '../i18n';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  busy?: boolean;
  icon?: ReactNode;
};
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    busy,
    icon,
    children,
    className = '',
    disabled,
    onClick,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`button button--${variant} button--${size} ${className}`}
      disabled={disabled || busy}
      onClick={onClick}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy ? <LoaderCircle size={17} className="spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
});
export function IconButton({ label, children, onClick, ...rest }: ButtonProps & { label: string }) {
  return (
    <Button
      {...rest}
      onClick={onClick}
      variant={rest.variant || 'ghost'}
      className={`icon-button ${rest.className || ''}`}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  );
}
export function Chip({
  children,
  tone = 'neutral',
  className = '',
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }) {
  return (
    <span className={`chip chip--${tone} ${className}`} {...rest}>
      {children}
    </span>
  );
}
export function Card({ children, className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card ${className}`} {...rest}>
      {children}
    </div>
  );
}
export function Metric({
  label,
  value,
  detail,
  icon,
  className = '',
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`metric ${className}`}>
      <div className="metric__label">
        {icon}
        {label}
      </div>
      <div className="metric__value">{value}</div>
      {detail && <div className="metric__detail">{detail}</div>}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state__icon">{icon}</div>}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className = '',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const { t } = useLocale();
  return (
    <PrimitiveDialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <PrimitiveDialog.Portal>
        <PrimitiveDialog.Overlay className="dialog-overlay" />
        <PrimitiveDialog.Content
          className={`dialog ${className}`}
          aria-describedby={description ? 'dialog-description' : undefined}
        >
          <div className="dialog__heading">
            <PrimitiveDialog.Title>{title}</PrimitiveDialog.Title>
            <PrimitiveDialog.Close asChild>
              <IconButton label={t('Tutup', 'Close')}>
                <X size={20} />
              </IconButton>
            </PrimitiveDialog.Close>
          </div>
          {description && (
            <PrimitiveDialog.Description id="dialog-description" className="dialog__description">
              {description}
            </PrimitiveDialog.Description>
          )}
          <div className="dialog__body">{children}</div>
          {footer && <div className="dialog__footer">{footer}</div>}
        </PrimitiveDialog.Content>
      </PrimitiveDialog.Portal>
    </PrimitiveDialog.Root>
  );
}
export function EntityHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="entity-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
export function Tabs({
  items,
  value,
  onChange,
  label,
}: {
  items: { value: string; label: string; count?: number }[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {items.map((item, i) => (
        <button
          type="button"
          key={item.value}
          role="tab"
          aria-selected={value === item.value}
          tabIndex={value === item.value ? 0 : -1}
          onClick={() => onChange(item.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              e.preventDefault();
              const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
              onChange(items[n].value);
              (e.currentTarget.parentElement?.children[n] as HTMLElement)?.focus();
            }
          }}
        >
          {item.label}
          {item.count !== undefined && <span>{item.count}</span>}
        </button>
      ))}
    </div>
  );
}
export function TextLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="text-link" onClick={onClick}>
      {children}
      <ArrowRight size={15} aria-hidden="true" />
    </button>
  );
}
export function LoadingSurface() {
  const { t } = useLocale();
  return (
    <div className="loading-surface" role="status">
      <span className="loading-mark">
        <LoaderCircle className="spin" size={24} />
      </span>
      <p>{t('Menyiapkan ruang kerja…', 'Preparing your workspace…')}</p>
    </div>
  );
}
export function DataTable<T>({
  columns,
  rows,
  rowKey,
}: {
  columns: {
    key: string;
    label: string;
    render: (row: T) => ReactNode;
    align?: 'left' | 'right' | 'center';
  }[];
  rows: T[];
  rowKey: (row: T) => string;
}) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th scope="col" key={c.key} style={{ textAlign: c.align }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((c) => (
                <td key={c.key} style={{ textAlign: c.align }}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
