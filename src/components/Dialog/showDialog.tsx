import React from 'react';
import {createRoot} from 'react-dom/client';
import {isFullscreenMedia, Logger} from 'utils';
import {DialogProps} from './Dialog';

const logger = new Logger('showDialog');

export default async function showDialog(
    Dialog: React.FC<DialogProps>,
    system = false
): Promise<string> {
    return new Promise((resolve, reject) => {
        const dialogRoot = document.getElementById(
            isFullscreenMedia() ? 'fullscreen-system' : system ? 'system' : 'app'
        );
        const rootElement = document.createElement('div');
        const root = createRoot(rootElement);
        const unmount = () => {
            rootElement.remove();
            root.unmount();
        };
        try {
            dialogRoot!.append(rootElement);
            root.render(
                <Dialog
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
