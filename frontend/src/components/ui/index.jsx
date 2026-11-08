function Button({ as: Component = "button", variant = "primary", className = "", children, ...props }) {
  return <Component className={`ds-button ds-button-${variant} ${className}`} {...props}>{children}</Component>;
}
function TextInput({ label, error, hint, id, className = "", ...props }) {
  return <label className={`ds-field ${className}`} htmlFor={id}><span>{label}</span><input id={id} className={`field-input ${error ? "field-input-error" : ""}`} aria-invalid={Boolean(error)} aria-describedby={error || hint ? `${id}-help` : undefined} {...props} />{(error || hint) && <small id={`${id}-help`} className={error ? "field-error" : ""}>{error || hint}</small>}</label>;
}
function Form({ children, className = "", ...props }) { return <form className={`ds-form ${className}`} {...props}>{children}</form>; }
function Card({ as: Component = "article", depth = "raised", className = "", children, ...props }) {
  return <Component className={`ds-card ds-card-${depth} ${className}`} {...props}>{children}</Component>;
}
function Badge({ tone = "gold", children }) { return <span className={`ds-badge ds-badge-${tone}`}>{children}</span>; }
function ProgressBar({ value = 0, label = "Progress" }) { const safe = Math.max(0, Math.min(100, value)); return <div className="ds-progress" aria-label={`${label}: ${safe}%`}><span style={{ width: `${safe}%` }} /></div>; }
function EmptyState({ title, description, action }) { return <div className="ds-empty"><span aria-hidden="true">◇</span><h3>{title}</h3><p>{description}</p>{action}</div>; }
function LoadingSkeleton({ lines = 3, className = "" }) { return <div className={`ds-skeleton ${className}`} aria-label="Loading">{Array.from({ length: lines }, (_, index) => <span key={index} />)}</div>; }
function PageHeader({ eyebrow, title, description, action }) { return <header className="ds-page-header"><div>{eyebrow && <p>{eyebrow}</p>}<h1>{title}</h1>{description && <span>{description}</span>}</div>{action}</header>; }
function Breadcrumbs({ items = [] }) { return <nav className="ds-breadcrumbs" aria-label="Breadcrumb">{items.map((item, index) => <span key={item.label}>{index > 0 && <i aria-hidden="true">/</i>}{item.href ? <a href={item.href}>{item.label}</a> : <b aria-current="page">{item.label}</b>}</span>)}</nav>; }
function Navigation({ items, value, onSelect, label = "Navigation" }) { return <nav className="ds-navigation" aria-label={label}>{items.map((item) => <button key={item.value} type="button" aria-current={value === item.value ? "page" : undefined} onClick={() => onSelect(item.value)}>{item.icon}{item.label}</button>)}</nav>; }
function Tabs({ items, value, onChange, label = "Sections" }) { return <div className="ds-tabs" role="tablist" aria-label={label}>{items.map((item) => <button type="button" role="tab" aria-selected={value === item.value} key={item.value} onClick={() => onChange(item.value)}>{item.label}</button>)}</div>; }
function Dropdown({ label, children, ...props }) { return <label className="ds-dropdown"><span>{label}</span><select className="field-input" {...props}>{children}</select></label>; }
function DataTable({ columns, rows, empty = "No records available." }) { return <div className="ds-table-wrap"><table className="ds-table"><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={row.id || index}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}</tr>) : <tr><td colSpan={columns.length}>{empty}</td></tr>}</tbody></table></div>; }
function Toast({ tone = "success", children, onClose }) { return <div className={`ds-toast ds-toast-${tone}`} role="status"><span>{children}</span>{onClose && <button type="button" onClick={onClose} aria-label="Dismiss notification">×</button>}</div>; }
function Modal({ open, title, children, onClose, footer }) { if (!open) return null; return <div className="ds-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}><section className="ds-modal" role="dialog" aria-modal="true" aria-labelledby="ds-modal-title"><header><h2 id="ds-modal-title">{title}</h2><button type="button" onClick={onClose} aria-label="Close dialog">×</button></header><div>{children}</div>{footer && <footer>{footer}</footer>}</section></div>; }

export { Badge, Breadcrumbs, Button, Card, DataTable, Dropdown, EmptyState, Form, LoadingSkeleton, Modal, Navigation, PageHeader, ProgressBar, Tabs, TextInput, Toast };
