import React from 'react';
import {createRoot} from 'react-dom/client';
import {PopupMenuProps} from './PopupMenu';

export default async function showPopupMenu(
    PopupMenu: React.FC<PopupMenuProps>,
    x: number,
    y: number
): Promise<string> {
    return new Promise((resolve, reject) => {
        const popupRoot = document.getElementById('popup')!;
        const rootElement = document.createElement('div');
        const root = createRoot(rootElement);
        try {
            const close = (action: string) => {
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
