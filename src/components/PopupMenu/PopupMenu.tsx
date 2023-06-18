import React, {useCallback, useEffect, useRef, useState} from 'react';
import {filter, fromEvent, merge, switchMap, timer} from 'rxjs';
import {preventDefault} from 'utils';
import './PopupMenu.scss';

export interface PopupMenuProps<T extends string = string> {
    onClose: (action?: T) => void;
    x: number;
    y: number;
    align?: 'left' | 'right';
}

interface BasePopupMenuProps<T extends string> extends PopupMenuProps<T> {
    children: React.ReactNode;
}

export default function PopupMenu<T extends string>({
    children,
    onClose,
    x,
    y,
    align = 'left',
}: BasePopupMenuProps<T>) {
    const popupRef = useRef<HTMLUListElement>(null);
    const restoreRef = useRef<HTMLElement>(document.activeElement as HTMLElement);
    const [style, setStyle] = useState<React.CSSProperties>({visibility: 'hidden'});
    const [buttons, setButtons] = useState<HTMLButtonElement[]>([]);
    const [buttonId, setButtonId] = useState('');

    useEffect(() => {
        const style: React.CSSProperties = {};
        const popup = popupRef.current!;
        const buttons = Array.from(popup.querySelectorAll('button'));
        if (align === 'right' || x + popup.offsetWidth > document.body.clientWidth) {
            style.left = `${x - popup.offsetWidth}px`;
        } else {
            style.left = `${x}px`;
        }
        if (y + popup.offsetHeight > document.body.clientHeight) {
            style.top = `${y - popup.offsetHeight}px`;
        } else {
            style.top = `${y}px`;
        }
        setButtons(buttons);
        setStyle(style);
    }, [align, x, y]);

    useEffect(() => {
        const button = buttons.find((button) => !button.disabled);
        button?.focus();
        setButtonId(button?.id || '');
    }, [buttons]);

    useEffect(() => {
        const subscription = merge(
            timer(0).pipe(
                switchMap(() =>
                    fromEvent(document, 'mousedown', {capture: true}).pipe(
                        filter((event) => !popupRef.current!.contains(event.target as HTMLElement))
                    )
                )
            ),
            fromEvent<KeyboardEvent>(document, 'keydown', {capture: true}).pipe(
                filter((event) => event.code === 'Escape' || event.code === 'Tab')
            ),
            fromEvent(window, 'blur')
        ).subscribe(() => {
            restoreRef.current?.focus();
            onClose();
        });
        return () => subscription.unsubscribe();
    }, [onClose]);

    const handleClick = useCallback(
        (event: React.MouseEvent) => {
            let button: any = event.target;
            while (button && button.nodeName !== 'BUTTON') {
                button = button.parentElement;
            }
            if (button?.value && !button.disabled) {
                restoreRef.current?.focus();
                onClose(button!.value);
            }
        },
        [onClose]
    );

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            let currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
            if (event.code === 'ArrowDown') {
                event.stopPropagation();
                currentIndex++;
            } else if (event.code === 'ArrowUp') {
                event.stopPropagation();
                currentIndex--;
            }
            currentIndex = Math.min(Math.max(currentIndex, 0), buttons.length - 1);
            const button = buttons[currentIndex];
            if (button && !button.disabled) {
                button.focus();
                setButtonId(button.id);
            }
        },
        [buttons]
    );

    const handleMouseOver = useCallback((event: React.MouseEvent) => {
        let button: any = event.target;
        while (button && button.nodeName !== 'BUTTON') {
            button = button.parentElement;
        }
        if (button && !button.disabled) {
            button.focus();
            setButtonId(button.id);
        }
    }, []);

    return (
        <ul
            className="popup-menu"
            tabIndex={-1}
            role="menu"
            aria-label="Actions"
            aria-activedescendant={buttonId}
            style={style}
            onClick={handleClick}
            onContextMenu={preventDefault}
            onKeyDown={handleKeyDown}
            onMouseOver={handleMouseOver}
            ref={popupRef}
        >
            {children}
        </ul>
    );
}
