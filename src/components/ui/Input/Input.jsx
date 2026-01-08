import './Input.css'

const Input = ({
    label,
    type = 'text',
    placeholder,
    value,
    onChange,
    error,
    helperText,
    icon: Icon,
    disabled = false,
    required = false,
    fullWidth = true,
    className = '',
    id,
    name,
    ...props
}) => {
    const inputId = id || name || label?.toLowerCase().replace(/\s/g, '-')

    return (
        <div className={`input-wrapper ${fullWidth ? 'input-full' : ''} ${className}`}>
            {label && (
                <label htmlFor={inputId} className="input-label">
                    {label}
                    {required && <span className="input-required">*</span>}
                </label>
            )}
            <div className={`input-container ${error ? 'input-error' : ''} ${disabled ? 'input-disabled' : ''}`}>
                {Icon && (
                    <span className="input-icon">
                        <Icon size={18} />
                    </span>
                )}
                <input
                    id={inputId}
                    name={name}
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    required={required}
                    className={`input ${Icon ? 'input-with-icon' : ''}`}
                    {...props}
                />
            </div>
            {(error || helperText) && (
                <span className={`input-helper ${error ? 'input-helper-error' : ''}`}>
                    {error || helperText}
                </span>
            )}
        </div>
    )
}

export default Input
