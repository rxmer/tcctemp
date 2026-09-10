function toOptionValue(opt) {
  return Array.isArray(opt) ? opt[0] : opt.value;
}

function toOptionLabel(opt) {
  return Array.isArray(opt) ? opt[1] : opt.label;
}

export function Select({
  label,
  name,
  id,
  value,
  onChange,
  options = [],
  placeholder = "Selecione...",
  className = "input-field",
  labelClassName = "input-label",
  wrapperClassName = "input-group",
  ...props
}) {
  const selectId = id || name;

  return (
    <div className={wrapperClassName}>
      {label && (
        <label className={labelClassName} htmlFor={selectId}>
          {label}
        </label>
      )}
      <select
        id={selectId}
        name={name}
        className={className}
        value={value}
        onChange={onChange}
        {...props}
      >
        {placeholder !== null && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={toOptionValue(opt)} value={toOptionValue(opt)}>
            {toOptionLabel(opt)}
          </option>
        ))}
      </select>
    </div>
  );
}