import React from 'react';
import {createRoot} from 'react-dom/client';
import {Logger} from 'utils';
import {PopupMenuProps} from './PopupMenu';

const logger = new Logger('showPopupMenu');

export default async function showPopupMenu<T extends string>(
    PopupMenu: React.FC<PopupMenuProps<T>>,
    x: number,
    y: number,
    align?: 'left' | 'right'
): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
        const popupRoot = document.getElementById('popup');
        const rootElement = document.createElement('div');
        const root = createRoot(rootElement);
        const unmount = () => {
            rootElement.remove();
            root.unmount();
        };
        try {
            popupRoot!.append(rootElement);
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
