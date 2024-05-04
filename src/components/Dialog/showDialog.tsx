import React from 'react';
import {createRoot} from 'react-dom/client';
import {DialogProps} from './Dialog';

export default async function showDialog(
    Dialog: React.FC<DialogProps>,
    system = false
): Promise<string> {
    return new Promise((resolve, reject) => {
        const rootElement = document.createElement('div');
        const root = createRoot(rootElement);
        try {
            document
                .getElementById(
                    document.fullscreenElement ? 'fullscreen-popup' : system ? 'system' : 'app'
                )!
                .append(rootElement);
            root.render(
                <Dialog
                    onClose={(returnValue: string) => {
                        root.unmount();
                        rootElement.remove();
                        resolve(returnValue);
                    }}
                />
            );
        } catch (err) {
            root.unmount();
            rootElement.remove();
            reject(err);
        }
    });
}
