import React from 'react';
import {confirm} from 'components/Dialog';

if (location.protocol === 'https:' && navigator.serviceWorker) {
    let reloading = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!reloading) {
            reloading = true;
            location.reload();
        }
    });

    window.addEventListener('load', async () => {
        const registration = await navigator.serviceWorker.register('/service-worker.js');

        const forceUpdate = async () => {
            const confirmed = await confirm({
                icon: 'ampcast',
                title: 'Update Available',
                message: (
                    <>
                        <p>A new version of Ampcast is available.</p>
                        <p>Install update?</p>
                    </>
                ),
                okLabel: 'Update',
                system: true,
            });
            if (confirmed) {
                registration.waiting?.postMessage('SKIP_WAITING');
            }
        };

        const waitForInstallation = () => {
            const installing = registration.installing;
            if (installing) {
                installing.addEventListener('statechange', async () => {
                    if (installing.state === 'installed') {
                        await forceUpdate();
                    }
                });
            }
        };

        if (registration.waiting) {
            await forceUpdate();
        } else if (registration.installing) {
            waitForInstallation();
        } else {
            registration.addEventListener('updatefound', waitForInstallation);
        }
    });
}
