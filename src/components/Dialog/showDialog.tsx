import React from 'react';
import {createRoot} from 'react-dom/client';
import {isFullscreenMedia} from 'utils';
import {DialogProps} from './Dialog';

export default async function showDialog(
    Dialog: React.FC<DialogProps>,
    system = false
): Promise<string> {
    return new Promise((resolve, reject) => {
        const dialogRoot = document.getElementById(
            isFullscreenMedia() ? 'fullscreen-popup' : system ? 'system' : 'app'
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
            console.error(err);
            unmount();
            reject(err);
        }
    });
}
