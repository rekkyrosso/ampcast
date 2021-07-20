import React from 'react';
import {createRoot} from 'react-dom/client';
import {DialogProps} from './Dialog';

export default async function showModal(Dialog: React.FC<DialogProps>): Promise<string> {
    return new Promise((resolve, reject) => {
        const rootElement = document.createElement('div');
        const root = createRoot(rootElement);
        try {
            const close = (returnValue: string) => {
                root.unmount();
                rootElement.remove();
                resolve(returnValue);
            };
            document.body.append(rootElement);
            root.render(<Dialog onClose={close} />);
        } catch (err) {
            root.unmount();
            rootElement.remove();
            reject(err);
        }
    });
}
