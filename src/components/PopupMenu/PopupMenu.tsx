import React, {useCallback, useEffect, useRef, useState} from 'react';
import {filter, fromEvent, merge, switchMap, timer} from 'rxjs';
import {preventDefault} from 'utils';
import useBaseFontSize from 'hooks/useBaseFontSize';
import './PopupMenu.scss';

export interface PopupMenuProps<T extends string = string> {
    onClose?: (action?: T) => void;
    x: number;
    y: number;
    id?: string;
    align?: 'left' | 'right';
    autoFocus?: boolean;
    hidden?: boolean;
    ref?: React.RefObject<HTMLUListElement | null>;
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
    ref,
}: BasePopupMenuProps<T>) {
    const containerRef = useRef<HTMLUListElement>(null);
    const restoreRef = useRef<HTMLElement>(document.activeElement as HTMLElement);
    const [style, setStyle] = useState<React.CSSProperties>({visibility: 'hidden'});
    const [focusable, setFocusable] = useState(false);
    const [buttonId, setButtonId] = useState('');
    const baseFontSize = useBaseFontSize();

    if (ref) {
        ref.current = containerRef.current;
    }

    useEffect(() => {
        const style: React.CSSProperties = {};
        const popup = containerRef.current!;
        const popupRoot = popup.closest('dialog,body')!;
        if (align === 'right' || x + popup.offsetWidth >= popupRoot.clientWidth) {
            style.left = `${x - popup.offsetWidth}px`;
        } else {
            style.left = `${x}px`;
        }
        if (y + popup.offsetHeight + baseFontSize >= popupRoot.clientHeight) {
            style.top = `${y - popup.offsetHeight}px`;
        } else {
            style.top = `${y}px`;
        }
        if (hidden) {
            style.visibility = 'hidden';
        }
        setStyle(style);
        setFocusable(!hidden);
    }, [align, x, y, hidden, baseFontSize]);

    useEffect(() => {
        if (focusable && autoFocus) {
            const buttons = getButtons(containerRef.current);
            const button = buttons.find((button) => !button.disabled);
            setButtonId(button?.id || '');
            if (button) {
                button.focus();
            }
        }
    }, [focusable, autoFocus]);

    useEffect(() => {
        if (onClose) {
            const subscription = timer(0)
                .pipe(
                    switchMap(() =>
                        merge(
                            fromEvent(document, 'mousedown', {capture: true}).pipe(
                                filter(
                                    (event) =>
                                        !containerRef.current!.contains(event.target as HTMLElement)
                                )
                            ),
                            fromEvent<KeyboardEvent>(document, 'keydown', {capture: true}).pipe(
                                filter((event) => event.code === 'Escape' || event.code === 'Tab')
                            ),
                            fromEvent(window, 'blur')
                        )
                    )
                )
                .subscribe(() => {
                    restoreRef.current?.focus();
                    onClose?.();
                });
            return () => subscription.unsubscribe();
        }
    }, [onClose]);

    const handleClick = useCallback(
        (event: React.MouseEvent) => {
            if (onClose) {
                const button = (event.target as HTMLElement).closest('button');
                if (button && !button.disabled) {
                    restoreRef.current?.focus();
                    onClose(button.value as T);
                }
            }
        },
        [onClose]
    );

    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        let increment = 0;
        if (event.code === 'ArrowDown') {
            event.stopPropagation();
            increment = 1;
        } else if (event.code === 'ArrowUp') {
            event.stopPropagation();
            increment = -1;
        }
        if (increment) {
            const buttons = getButtons(containerRef.current);
            let currentIndex =
                buttons.indexOf(document.activeElement as HTMLButtonElement) + increment;
            let button = buttons[currentIndex];
            while (button && button.disabled) {
                currentIndex += increment;
                button = buttons[currentIndex];
            }
            if (button && !button.disabled) {
                button.focus();
                setButtonId(button.id);
            }
        }
    }, []);

    const handleMouseOver = useCallback((event: React.MouseEvent) => {
        const button = (event.target as HTMLElement).closest('button');
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
            ref={containerRef}
        >
            {children}
        </ul>
    );
}

function getButtons(menu: HTMLElement | null): readonly HTMLButtonElement[] {
    return menu ? Array.from(menu.querySelectorAll<HTMLButtonElement>(':scope > li > button')) : [];
}
