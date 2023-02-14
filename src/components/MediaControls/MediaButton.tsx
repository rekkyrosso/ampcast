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
        ref.current!.classList.toggle('active', true);
    }, []);

    const handleMouseUp = useCallback((event: React.MouseEvent) => {
        event.stopPropagation();
        ref.current!.classList.toggle('active', false);
    }, []);

    return (
        <button
            {...props}
            className={`media-button ${className}`}
            type="button"
            onClick={onClick}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            ref={ref}
        >
            {children}
        </button>
    );
}
