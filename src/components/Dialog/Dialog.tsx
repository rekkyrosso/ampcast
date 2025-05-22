import React, {useCallback, useEffect, useImperativeHandle, useRef, useState} from 'react';
import {Subscription, fromEvent} from 'rxjs';
import {Except} from 'type-fest';
import {clamp, preventDefault, stopPropagation} from 'utils';
import Icon, {IconName} from 'components/Icon';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import './Dialog.scss';

export interface DialogProps
    extends Except<React.DialogHTMLAttributes<HTMLDialogElement>, 'title' | 'onClose'> {
    icon?: IconName;
    title?: string;
    onClose: (returnValue: string) => void;
    ref?: React.Ref<DialogHandle | null>;
}

export interface DialogHandle {
    close: (returnValue?: string) => void;
}

interface DialogPosition {
    left: number;
    top: number;
}

const startPosition: DialogPosition = {left: 0, top: 0};

export default function Dialog({
    icon,
    title,
    className = '',
    children,
    onClose,
    ref,
    ...props
}: DialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [position, setPosition] = useState<DialogPosition>(startPosition);
    const [dragStart, setDragStart] = useState<DialogPosition | null>(null);
    const [dragPosition, setDragPosition] = useState<DialogPosition>(startPosition);

    useImperativeHandle(ref, () => ({
        close: (returnValue?: string) => {
            if (dialogRef.current?.open) {
                dialogRef.current.close(returnValue);
            }
        },
    }));

    useEffect(() => {
        dialogRef.current?.showModal();
    }, []);

    useEffect(() => {
        const subscription = fromEvent(window, 'resize').subscribe(() => {
            const newPosition = clampPosition(dialogRef.current!, position);
            setPosition(newPosition);
        });
        return () => subscription.unsubscribe();
    }, [position]);

    const close = useCallback(() => {
        dialogRef.current!.close();
    }, []);

    const handleClose = useCallback(() => {
        onClose(dialogRef.current!.returnValue);
    }, [onClose]);

    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        if (event.key === 'Escape') {
            // Safari restores the main window (if it was maximized).
            event.preventDefault();
            event.stopPropagation();
            dialogRef.current!.close();
        }
    }, []);

    const handleBodyClick = useCallback((event: React.MouseEvent) => {
        const button = (event.target as HTMLElement).closest('button');
        if (button?.value === '#cancel') {
            event.preventDefault();
            dialogRef.current!.close();
        }
    }, []);

    const handleDragStart = useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.button === 0) {
            setDragStart({left: event.screenX, top: event.screenY});
        }
    }, []);

    useEffect(() => {
        if (dragStart) {
            let dragPosition = {left: 0, top: 0};
            const endDrag = () => {
                setPosition((position) =>
                    clampPosition(dialogRef.current!, {
                        left: position.left + dragPosition.left,
                        top: position.top + dragPosition.top,
                    })
                );
                setDragPosition({left: 0, top: 0});
                setDragStart(null);
            };
            const subscription = new Subscription();
            subscription.add(
                fromEvent<MouseEvent>(document, 'mousemove').subscribe((event) => {
                    dragPosition = {
                        left: event.screenX - dragStart!.left,
                        top: event.screenY - dragStart!.top,
                    };
                    setDragPosition(dragPosition);
                })
            );
            subscription.add(fromEvent(document, 'mouseup').subscribe(endDrag));
            subscription.add(fromEvent(window, 'blur').subscribe(endDrag));
            return () => subscription.unsubscribe();
        }
    }, [dragStart]);

    return (
        <dialog
            {...props}
            className={`dialog ${className}`}
            onClose={handleClose}
            onKeyDown={handleKeyDown}
            onMouseDown={preventDefault}
            style={{
                transform: `translate(${position.left + dragPosition.left}px, ${
                    position.top + dragPosition.top
                }px)`,
            }}
            ref={dialogRef}
        >
            <header className="dialog-head" onMouseDown={handleDragStart}>
                <h2>{icon ? <MediaSourceLabel icon={icon} text={title} /> : title}</h2>
                <div
                    className="dialog-close"
                    role="button"
                    onClick={close}
                    onMouseDown={stopPropagation}
                    aria-label="Close"
                >
                    <Icon name="close" />
                </div>
            </header>
            <div className="dialog-body" onMouseDown={stopPropagation} onClick={handleBodyClick}>
                {children}
            </div>
        </dialog>
    );
}

function clampPosition(dialog: HTMLDialogElement, position: DialogPosition): DialogPosition {
    const body = document.body;
    const dragRegion = body.querySelector('.app-drag-region') as HTMLElement | null;
    const dragRegionHeight = dragRegion?.offsetHeight || 0;
    const clientWidth = body.clientWidth;
    const clientHeight = body.clientHeight;
    const dialogWidth = dialog.offsetWidth;
    const dialogHeight = dialog.offsetHeight;
    const minLeft = (dialogWidth - clientWidth) / 2;
    const maxLeft = (clientWidth - dialogWidth) / 2;
    const minTop = (dialogHeight - clientHeight) / 2 + dragRegionHeight;
    const maxTop = (clientHeight - dialogHeight) / 2;
    const left = clamp(minLeft, position.left, maxLeft);
    const top = clamp(minTop, position.top, maxTop);
    return {left, top};
}
