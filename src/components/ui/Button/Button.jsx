import './Button.css'

const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    disabled = false,
    loading = false,
    icon: Icon,
    onClick,
    type = 'button',
    className = '',
    ...props
}) => {
    const classNames = [
        'btn',
        `btn-${variant}`,
        `btn-${size}`,
        fullWidth && 'btn-full',
        disabled && 'btn-disabled',
        loading && 'btn-loading',
        className
    ].filter(Boolean).join(' ')

    return (
        <button
            type={type}
            className={classNames}
            disabled={disabled || loading}
            onClick={onClick}
            {...props}
        >
            {loading ? (
                <span className="btn-spinner" />
            ) : (
                <>
                    {Icon && <Icon size={size === 'sm' ? 16 : 20} />}
                    {children && <span>{children}</span>}
                </>
            )}
        </button>
    )
}

export default Button
