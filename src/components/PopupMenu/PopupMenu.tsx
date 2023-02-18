import React, {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {filter, fromEvent, merge, switchMap, timer} from 'rxjs';
import './PopupMenu.scss';

export interface PopupMenuProps<T extends string = string> {
    onClose: (action?: T) => void;
    x: number;
    y: number;
}

export interface BasePopupMenuProps<T extends string> extends PopupMenuProps<T> {
    className?: string;
    children: React.ReactNode;
}

export default function PopupMenu<T extends string>({
    className = '',
    children,
    onClose,
    x,
    y,
}: BasePopupMenuProps<T>) {
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
            timer(0).pipe(
                switchMap(() =>
                    fromEvent(document, 'mousedown', {capture: true}).pipe(
                        filter((event) => !popupRef.current!.contains(event.target as HTMLElement))
                    )
                )
            ),
            fromEvent(document, 'keydown', {capture: true}),
            fromEvent(document, 'contextmenu', {capture: true}),
            fromEvent(window, 'blur')
        ).subscribe(() => onClose());
        return () => subscription.unsubscribe();
    }, [onClose]);

    const handleClick = useCallback(
        (event: React.MouseEvent) => {
            let button: any = event.target;
            while (button && !button.value) {
                button = button.parentElement;
            }
            if (button?.value && !button.disabled) {
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
