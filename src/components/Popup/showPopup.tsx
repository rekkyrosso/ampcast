import React from 'react';
import {createRoot} from 'react-dom/client';
import {isFullscreenMedia, Logger} from 'utils';
import {PopupProps} from './Popup';

const logger = new Logger('showPopup');

export default async function showPopup(
    Popup: React.FC<PopupProps>,
    x: number,
    y: number,
    align: 'left' | 'right' = 'left',
    system?: boolean
): Promise<string> {
    return new Promise((resolve, reject) => {
        const popupRoot = document.getElementById(
            isFullscreenMedia() ? 'fullscreen-system' : system ? 'system' : 'app'
        );
        const rootElement = document.createElement('div');
        const root = createRoot(rootElement);
        const unmount = () => {
            rootElement.remove();
            root.unmount();
        };
        try {
            popupRoot!.append(rootElement);
            root.render(
                <Popup
                    x={x}
                    y={y}
                    align={align}
                    onClose={(returnValue: string) => {
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
