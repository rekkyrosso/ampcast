import React from 'react';
import {createRoot} from 'react-dom/client';
import {PopupMenuProps} from './PopupMenu';

export default async function showPopupMenu<T extends string>(
    PopupMenu: React.FC<PopupMenuProps<T>>,
    x: number,
    y: number
): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
        const popupRoot = document.getElementById('popup')!;
        const rootElement = document.createElement('div');
        const root = createRoot(rootElement);
        try {
            const close = (action?: T) => {
                root.unmount();
                rootElement.remove();
                resolve(action);
            };
            popupRoot.append(rootElement);
            root.render(<PopupMenu x={x} y={y} onClose={close} />);
        } catch (err) {
            root.unmount();
            rootElement.remove();
            reject(err);
        }
    });
}
