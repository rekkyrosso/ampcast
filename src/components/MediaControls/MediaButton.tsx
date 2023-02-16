import React, {useCallback, useRef} from 'react';
import './MediaButton.scss';

export type MediaButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function MediaButton({
    children,
    className = '',
    onClick,
    ...props
}: MediaButtonProps) {
    const ref = useRef<HTMLButtonElement>(null);

    const handleMouseDown = useCallback((event: React.MouseEvent) => {
        event.stopPropagation();
        event.preventDefault();
        // Removed with a global hook.
        ref.current!.classList.toggle('active', true);
    }, []);

    return (
        <button
            {...props}
            className={`media-button ${className}`}
            type="button"
            onClick={onClick}
            onMouseDown={handleMouseDown}
            ref={ref}
        >
            {children}
        </button>
    );
}
