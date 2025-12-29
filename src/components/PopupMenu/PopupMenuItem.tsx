import React, {useCallback, useId, useRef, useState} from 'react';
import {stopPropagation} from 'utils';
import useOnResize from 'hooks/useOnResize';
import PopupMenu, {getPopupMenuButtons} from './PopupMenu';

export interface PopupMenuItemProps<T extends string>
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    label: React.ReactNode;
    value?: T;
    acceleratorKey?: React.ReactNode;
    children?: React.ReactNode;
}

export default function PopupMenuItem<T extends string>({
    className = '',
    label,
    acceleratorKey = '',
    children,
    role = 'menuitem',
    onClick,
    ...props
}: PopupMenuItemProps<T>) {
    const id = useId();
    const ref = useRef<HTMLLIElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const popupRef = useRef<HTMLUListElement>(null);
    const hasPopup = !!children;
    const [popupHidden, setPopupHidden] = useState(true);
    const [{x, y}, setPosition] = useState({x: 0, y: 0});
    const [align, setAlign] = useState<'left' | 'right'>('left');

    const onResize = useCallback(() => {
        if (hasPopup) {
            const menuItem = ref.current;
            const popup = popupRef.current;
            if (menuItem && popup) {
                const {left, right, top} = menuItem.getBoundingClientRect();
                const {width} = popup.getBoundingClientRect();
                if (right + width + 1 >= document.body.clientWidth) {
                    setAlign('right');
                    setPosition({x: left, y: top - 1});
                } else {
                    setAlign('left');
                    setPosition({x: right, y: top - 1});
                }
            }
        }
    }, [hasPopup]);

    useOnResize(ref, onResize);

    const handleBlur = useCallback(() => {
        setPopupHidden(true);
    }, []);

    const handleFocus = useCallback(() => {
        onResize(); // TODO: Why do I need this?
        setPopupHidden(false);
    }, [onResize]);

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            const code = event.code;
            if (code === 'Enter' || code === 'Space') {
                event.stopPropagation();
            } else if (
                (align === 'left' && code === 'ArrowLeft') ||
                (align === 'right' && code === 'ArrowRight')
            ) {
                event.stopPropagation();
                buttonRef.current!.focus();
            } else if (
                (align === 'left' && code === 'ArrowRight') ||
                (align === 'right' && code === 'ArrowLeft')
            ) {
                event.stopPropagation();
                const buttons = getPopupMenuButtons(popupRef.current);
                const button = buttons.find((button) => !button.disabled);
                button?.focus();
            }
        },
        [align]
    );

    return (
        <li
            className={`popup-menu-item ${className} ${
                hasPopup ? 'has-popup has-popup-' + align : ''
            } ${popupHidden ? '' : 'showing-popup'}`}
            role="presentation"
            onBlur={hasPopup ? handleBlur : undefined}
            onFocus={hasPopup ? handleFocus : undefined}
            onKeyDown={popupHidden ? undefined : handleKeyDown}
            ref={ref}
        >
            <button
                {...props}
                id={id}
                role={hasPopup ? undefined : role}
                tabIndex={-1}
                aria-haspopup={hasPopup ? 'true' : undefined}
                aria-controls={hasPopup ? `${id}-popup` : undefined}
                onMouseDown={stopPropagation}
                onMouseUp={stopPropagation}
                onClick={hasPopup ? stopPropagation : onClick}
                ref={buttonRef}
            >
                <span className="popup-menu-item-label">{label}</span>
                {acceleratorKey && !hasPopup ? (
                    <span className="popup-menu-item-accelerator-key">{acceleratorKey}</span>
                ) : null}
            </button>
            {hasPopup ? (
                <PopupMenu
                    id={`${id}-popup`}
                    x={x}
                    y={y}
                    align={align}
                    hidden={popupHidden}
                    ref={popupRef}
                >
                    {children}
                </PopupMenu>
            ) : null}
        </li>
    );
}
