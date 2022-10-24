import React, {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {fromEvent, merge} from 'rxjs';
import './PopupMenu.scss';

export interface PopupMenuProps {
    onClose: (action: string) => void;
    x: number;
    y: number;
}

export interface BasePopupMenuProps extends PopupMenuProps {
    className?: string;
    children: React.ReactNode;
}

export default function PopupMenu({className = '', children, onClose, x, y}: BasePopupMenuProps) {
    const popupRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({visibility: 'hidden'});

    useLayoutEffect(() => {
        const style: React.CSSProperties = {};
        const popup = popupRef.current!;
        if (x + popup.offsetWidth > document.body.clientWidth) {
            style.left = `${x - popup.offsetWidth}px`;
        } else {
            style.left = `${x}px`;
        }
        if (y + popup.offsetHeight > document.body.clientHeight) {
            style.top = `${y - popup.offsetHeight}px`;
        } else {
            style.top = `${y}px`;
        }
        setStyle(style);
    }, [x, y]);

    useEffect(() => {
        const subscription = merge(
            fromEvent(document, 'click'),
            fromEvent(document, 'keydown', {capture: true}),
            fromEvent(document, 'contextmenu', {capture: true}),
            fromEvent(window, 'blur')
        ).subscribe(() => onClose(''));
        return () => subscription.unsubscribe();
    }, [onClose]);

    const handleClick = useCallback(
        (event: React.MouseEvent) => {
            let button: any = event.target;
            while (button && !button.value) {
                button = button.parentElement;
            }
            if (button?.value) {
                onClose(button!.value);
            }
        },
        [onClose]
    );

    return (
        <menu
            className={`popup-menu ${className}`}
            onClick={handleClick}
            style={style}
            ref={popupRef}
        >
            {children}
        </menu>
    );
}
