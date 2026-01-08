import './Card.css'

const Card = ({
    children,
    title,
    subtitle,
    icon: Icon,
    action,
    variant = 'default',
    padding = 'md',
    className = '',
    ...props
}) => {
    return (
        <div className={`card card-${variant} card-padding-${padding} ${className}`} {...props}>
            {(title || Icon || action) && (
                <div className="card-header">
                    <div className="card-header-left">
                        {Icon && (
                            <div className="card-icon">
                                <Icon size={20} />
                            </div>
                        )}
                        <div className="card-titles">
                            {title && <h3 className="card-title">{title}</h3>}
                            {subtitle && <p className="card-subtitle">{subtitle}</p>}
                        </div>
                    </div>
                    {action && <div className="card-action">{action}</div>}
                </div>
            )}
            <div className="card-content">
                {children}
            </div>
        </div>
    )
}

export default Card
