import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import {Subscription, fromEvent} from 'rxjs';
import {Except} from 'type-fest';
import {stopPropagation} from 'utils';
import Icon from 'components/Icon';
import dialogPolyfill from 'libs/dialog-polyfill';
import 'libs/dialog-polyfill/dialog-polyfill.css';
import './Dialog.scss';

export interface DialogProps
    extends Except<React.DialogHTMLAttributes<HTMLDialogElement>, 'title' | 'onClose'> {
    title?: React.ReactNode;
    onClose: (returnValue: string) => void;
}

export interface DialogHandle {
    close: (returnValue?: string) => void;
}

interface DialogPosition {
    left: number;
    top: number;
}

const startPosition: DialogPosition = {left: 0, top: 0};

function Dialog(
    {title, className = '', children, onClose, ...props}: DialogProps,
    ref: React.ForwardedRef<DialogHandle>
) {
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
        const dialog = dialogRef.current!;
        dialogPolyfill.registerDialog(dialog);
        dialog.showModal();
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
        let button: any = event.target;
        while (button && button.nodeName !== 'BUTTON') {
            button = button.parentElement;
        }
        if (button?.value === '#cancel') {
            event.preventDefault();
            dialogRef.current!.close();
        }
    }, []);

    const handleMouseDown = useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        if (event.button === 0) {
            setDragStart({left: event.screenX, top: event.screenY});
        }
    }, []);

    const handleMouseMove = useCallback(
        (event: MouseEvent) => {
            setDragPosition({
                left: event.screenX - dragStart!.left,
                top: event.screenY - dragStart!.top,
            });
        },
        [dragStart]
    );

    const handleMouseUp = useCallback(
        (event: MouseEvent) => {
            const newPosition = clampPosition(dialogRef.current!, {
                left: position.left + (event.screenX - dragStart!.left),
                top: position.top + (event.screenY - dragStart!.top),
            });
            setPosition(newPosition);
            setDragPosition(startPosition);
            setDragStart(null);
        },
        [position, dragStart]
    );

    useEffect(() => {
        if (dragStart) {
            document.body.classList.add('dragging');
            const fromMouseEvent = (type: string) => fromEvent<MouseEvent>(document, type);
            const subscription = new Subscription();
            subscription.add(fromMouseEvent('mouseup').subscribe(handleMouseUp));
            subscription.add(fromMouseEvent('mousemove').subscribe(handleMouseMove));
            subscription.add(
                fromEvent(window, 'blur').subscribe(() => {
                    setDragPosition(startPosition);
                    setDragStart(null);
                })
            );
            return () => {
                document.body.classList.remove('dragging');
                subscription.unsubscribe();
            };
        }
    }, [dragStart, handleMouseMove, handleMouseUp]);

    return (
        <dialog
            {...props}
            className={`dialog ${className}`}
            onClose={handleClose}
            onKeyDown={handleKeyDown}
            style={{
                transform: `translate(${position.left + dragPosition.left}px, ${
                    position.top + dragPosition.top
                }px)`,
            }}
            ref={dialogRef}
        >
            <header className="dialog-head" onMouseDown={handleMouseDown}>
                <h2>{title}</h2>
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
            <div className="dialog-body" onClick={handleBodyClick}>
                {children}
            </div>
        </dialog>
    );
}

function clampPosition(dialog: HTMLDialogElement, position: DialogPosition): DialogPosition {
    const body = document.body;
    const dragRegion = body.querySelector('.electron .app-drag-region') as HTMLElement | null;
    const dragRegionHeight = dragRegion?.offsetHeight || 0;
    const clientWidth = body.clientWidth;
    const clientHeight = body.clientHeight;
    const dialogWidth = dialog.offsetWidth;
    const dialogHeight = dialog.offsetHeight;
    const minLeft = (dialogWidth - clientWidth) / 2;
    const maxLeft = (clientWidth - dialogWidth) / 2;
    const minTop = (dialogHeight - clientHeight) / 2 + dragRegionHeight;
    const maxTop = (clientHeight - dialogHeight) / 2;
    const left = Math.max(Math.min(position.left, maxLeft), minLeft);
    const top = Math.max(Math.min(position.top, maxTop), minTop);
    return {left, top};
}

export default forwardRef<DialogHandle, DialogProps>(Dialog);
