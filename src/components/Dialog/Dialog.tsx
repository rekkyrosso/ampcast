import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import {Except} from 'type-fest';
import {stopPropagation} from 'utils';
import Button from 'components/Button';
import Icon from 'components/Icon';
import dialogPolyfill from 'dialog-polyfill';
import 'dialog-polyfill/dialog-polyfill.css';
import './Dialog.scss';

export interface DialogProps
    extends Except<React.DialogHTMLAttributes<HTMLDialogElement>, 'onClose'> {
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
            if (dialogRef.current!.open) {
                dialogRef.current!.close(returnValue);
            }
        },
    }));

    useEffect(() => {
        const dialog = dialogRef.current!;
        dialogPolyfill.registerDialog(dialog);
        dialog.showModal();
    }, []);

    const close = useCallback(() => {
        dialogRef.current!.close();
    }, []);

    const handleClose = useCallback(() => {
        onClose(dialogRef.current!.returnValue);
    }, [onClose]);

    const handleBodyClick = useCallback((event: React.MouseEvent) => {
        let button: any = event.target;
        while (button && button.type !== 'submit') {
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
            setPosition({
                left: position.left + (event.screenX - dragStart!.left),
                top: position.top + (event.screenY - dragStart!.top),
            });
            setDragPosition(startPosition);
            setDragStart(null);
        },
        [position, dragStart]
    );

    useEffect(() => {
        if (dragStart) {
            document.documentElement.style.cursor = 'default';
            document.body.classList.add('dragging');
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('mousemove', handleMouseMove);
            return () => {
                document.documentElement.style.cursor = '';
                document.body.classList.remove('dragging');
                document.removeEventListener('mouseup', handleMouseUp);
                document.removeEventListener('mousemove', handleMouseMove);
            };
        }
    }, [dragStart, handleMouseMove, handleMouseUp]);

    return (
        <dialog
            {...props}
            className={`dialog ${className}`}
            onClose={handleClose}
            style={{
                transform: `translate(${position.left + dragPosition.left}px, ${
                    position.top + dragPosition.top
                }px)`,
            }}
            ref={dialogRef}
        >
            <header className="dialog-head" onMouseDown={handleMouseDown}>
                <h2>{title}</h2>
                <Button onClick={close} onMouseDown={stopPropagation}>
                    <Icon name="close" />
                </Button>
            </header>
            <div className="dialog-body" onClick={handleBodyClick}>
                {children}
            </div>
        </dialog>
    );
}

export default forwardRef<DialogHandle, DialogProps>(Dialog);
