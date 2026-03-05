import React, {useCallback, useEffect, useImperativeHandle, useRef, useState} from 'react';
import {fromEvent} from 'rxjs';
import {Except} from 'type-fest';
import {stopPropagation} from 'utils';
import useBaseFontSize from 'hooks/useBaseFontSize';
import './Popup.scss';

export interface PopupHandle {
    close: (returnValue?: string) => void;
}

export interface PopupProps extends Except<
    React.DialogHTMLAttributes<HTMLDialogElement>,
    'onClose'
> {
    x: number;
    y: number;
    align?: 'left' | 'right';
    autoClose?: boolean;
    className?: string;
    children?: React.ReactNode;
    onClose: (returnValue: string) => void;
    ref?: React.Ref<PopupHandle | null>;
}

export default function Popup({
    x,
    y,
    align,
    autoClose,
    className = '',
    children,
    onClose,
    ref,
    ...props
}: PopupProps) {
    const popupRef = useRef<HTMLDialogElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({visibility: 'hidden'});
    const baseFontSize = useBaseFontSize();

    useImperativeHandle(ref, () => ({
        close: (returnValue?: string) => {
            if (popupRef.current?.open) {
                popupRef.current.close(returnValue);
            }
        },
    }));

    useEffect(() => {
        popupRef.current?.showModal();
        const subscription = fromEvent(window, 'resize').subscribe(() => {
            popupRef.current?.close();
        });
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        const style: React.CSSProperties = {};
        const popup = popupRef.current!;
        const popupRoot = document.documentElement;
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
        setStyle(style);
    }, [align, x, y, baseFontSize]);

    const handleClose = useCallback(() => {
        onClose(popupRef.current!.returnValue);
    }, [onClose]);

    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        if (event.key === 'Escape') {
            // Safari restores the main window (if it was maximized).
            event.preventDefault();
            event.stopPropagation();
            popupRef.current?.close();
        }
    }, []);

    const handleBodyClick = useCallback((event: React.MouseEvent) => {
        const button = (event.target as HTMLElement).closest('button');
        if (button?.value === '#cancel') {
            event.preventDefault();
            popupRef.current?.close();
        }
    }, []);

    const handleMouseDown = useCallback(() => {
        if (autoClose) {
            popupRef.current?.close();
        }
    }, [autoClose]);

    return (
        <dialog
            {...props}
            className={`popup ${className}`}
            onClose={handleClose}
            onKeyDown={handleKeyDown}
            onMouseDown={handleMouseDown}
            style={style}
            ref={popupRef}
        >
            <div className="popup-body" onMouseDown={stopPropagation} onClick={handleBodyClick}>
                {children}
            </div>
        </dialog>
    );
}
