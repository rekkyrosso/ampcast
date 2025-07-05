import React from 'react';
import {createRoot} from 'react-dom/client';
import {Logger} from 'utils';
import {PopupMenuProps} from './PopupMenu';

const logger = new Logger('showPopupMenu');

export default async function showPopupMenu<T extends string>(
    PopupMenu: React.FC<PopupMenuProps<T>>,
    target: HTMLElement,
    x: number,
    y: number,
    align?: 'left' | 'right'
): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
        const popupRoot = target.closest('dialog,.layer')!;
        const rootElement = document.createElement('div');
        const root = createRoot(rootElement);
        if (popupRoot.nodeName === 'DIALOG') {
            const rect = popupRoot.getBoundingClientRect();
            x -= rect.left;
            y -= rect.top;
        }
        const unmount = () => {
            rootElement.remove();
            root.unmount();
        };
        try {
            popupRoot.append(rootElement);
            root.render(
                <PopupMenu
                    x={x}
                    y={y}
                    align={align}
                    autoFocus
                    onClose={(returnValue?: T) => {
                        unmount();
                        resolve(returnValue);
                    }}
                />
            );
        } catch (err) {
            logger.error(err);
            unmount();
            reject(err);
        }
    });
}
