import React, {useCallback, useEffect, useRef, useState} from 'react';
import {filter, fromEvent, merge, switchMap, timer} from 'rxjs';
import {preventDefault} from 'utils';
import './PopupMenu.scss';

export interface PopupMenuProps<T extends string = string> {
    onClose?: (action?: T) => void;
    x: number;
    y: number;
    id?: string;
    align?: 'left' | 'right';
    autoFocus?: boolean;
    hidden?: boolean;
    popupRef?: React.MutableRefObject<HTMLUListElement | null>;
}

interface BasePopupMenuProps<T extends string> extends PopupMenuProps<T> {
    children: React.ReactNode;
}

export default function PopupMenu<T extends string>({
    id,
    children,
    onClose,
    x,
    y,
    align = 'left',
    autoFocus,
    hidden,
    popupRef,
}: BasePopupMenuProps<T>) {
    const ref = useRef<HTMLUListElement>(null);
    const restoreRef = useRef<HTMLElement>(document.activeElement as HTMLElement);
    const [style, setStyle] = useState<React.CSSProperties>({visibility: 'hidden'});
    const [buttons, setButtons] = useState<HTMLButtonElement[]>([]);
    const [buttonId, setButtonId] = useState('');

    if (popupRef) {
        popupRef.current = ref.current;
    }

    useEffect(() => {
        const style: React.CSSProperties = {};
        const popup = ref.current!;
        const buttons = Array.from(
            popup.querySelectorAll<HTMLButtonElement>(':scope > li > button')
        );
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
        if (hidden) {
            style.visibility = 'hidden';
        }
        setButtons(buttons);
        setStyle(style);
    }, [align, x, y, hidden]);

    useEffect(() => {
        const button = buttons.find((button) => !button.disabled);
        setButtonId(button?.id || '');
        if (autoFocus && button) {
            button.focus();
        }
    }, [buttons, autoFocus]);

    useEffect(() => {
        if (onClose) {
            const subscription = merge(
                timer(0).pipe(
                    switchMap(() =>
                        fromEvent(document, 'mousedown', {capture: true}).pipe(
                            filter((event) => !ref.current!.contains(event.target as HTMLElement))
                        )
                    )
                ),
                fromEvent<KeyboardEvent>(document, 'keydown', {capture: true}).pipe(
                    filter((event) => event.code === 'Escape' || event.code === 'Tab')
                ),
                fromEvent(window, 'blur')
            ).subscribe(() => {
                restoreRef.current?.focus();
                onClose?.();
            });
            return () => subscription.unsubscribe();
        }
    }, [onClose]);

    const handleClick = useCallback(
        (event: React.MouseEvent) => {
            if (onClose) {
                let button: any = event.target;

                while (button && button.nodeName !== 'BUTTON') {
                    button = button.parentElement;
                }
                if (button?.value && !button.disabled) {
                    restoreRef.current?.focus();
                    onClose(button!.value);
                }
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
            id={id}
            tabIndex={-1}
            hidden={hidden}
            role="menu"
            aria-label="Actions"
            aria-activedescendant={buttonId}
            style={style}
            onClick={handleClick}
            onContextMenu={preventDefault}
            onKeyDown={handleKeyDown}
            onMouseOver={handleMouseOver}
            ref={ref}
        >
            {children}
        </ul>
    );
}
