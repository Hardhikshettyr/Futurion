import { useState } from "react";

function EyeIcon({ hidden }) {
  return hidden ? (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.2A10.8 10.8 0 0 1 12 4c5.3 0 9 5.1 9 5.1a15.8 15.8 0 0 1-2.2 2.8M6.2 6.2A16.6 16.6 0 0 0 3 9.1S6.7 14.2 12 14.2c.8 0 1.6-.1 2.3-.3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 12s3.7-5.1 9-5.1S21 12 21 12s-3.7 5.1-9 5.1S3 12 3 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function PasswordField({ id, label, error, ...inputProps }) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-[#294a4c]">{label}</label>
      <div className="relative">
        <input
          {...inputProps}
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`field-input pr-12 ${error ? "field-input-error" : ""}`}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 grid w-12 place-items-center text-[#637676] transition hover:text-[#173f3c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#e9794a]"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          <EyeIcon hidden={visible} />
        </button>
      </div>
      {error && <p id={`${id}-error`} className="field-error">{error}</p>}
    </div>
  );
}

export default PasswordField;
