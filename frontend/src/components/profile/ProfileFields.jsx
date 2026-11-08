function FieldShell({ error, hint, id, label, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-[#294a4c]">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs leading-5 text-[#788986]">{hint}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

function TextField({ error, hint, label, ...props }) {
  return (
    <FieldShell error={error} hint={hint} id={props.id} label={label}>
      <input {...props} className={`field-input ${error ? "field-input-error" : ""}`} />
    </FieldShell>
  );
}

function TextareaField({ error, hint, label, rows = 4, ...props }) {
  return (
    <FieldShell error={error} hint={hint} id={props.id} label={label}>
      <textarea {...props} rows={rows} className={`field-input resize-y ${error ? "field-input-error" : ""}`} />
    </FieldShell>
  );
}

function SelectField({ error, label, options, ...props }) {
  return (
    <FieldShell error={error} id={props.id} label={label}>
      <select {...props} className={`field-input ${error ? "field-input-error" : ""}`}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </FieldShell>
  );
}

function TagsField({ hint = "Separate entries with commas", label, onChange, value, ...props }) {
  return (
    <TextField
      {...props}
      label={label}
      hint={hint}
      value={(value || []).join(", ")}
      onChange={(event) =>
        onChange(
          event.target.value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        )
      }
    />
  );
}

export { SelectField, TagsField, TextareaField, TextField };
