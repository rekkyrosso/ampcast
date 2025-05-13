import React, {useCallback, useRef} from 'react';
import {Except} from 'type-fest';
import {cancelEvent} from 'utils';
import Icon, {IconName} from 'components/Icon';
import './MediaButton.scss';

export interface MediaButtonProps
    extends Except<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
    icon: IconName;
}

export default function MediaButton({icon, className = '', ...props}: MediaButtonProps) {
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
            className={`media-button media-button-${icon} ${className}`}
            type="button"
            onMouseDown={handleMouseDown}
            onContextMenu={cancelEvent}
            ref={ref}
        >
            <Icon name={icon} />
        </button>
    );
}
