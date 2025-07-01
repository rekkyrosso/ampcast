import React from 'react';
import {confirm} from 'components/Dialog';

if (location.protocol === 'https:' && navigator.serviceWorker) {
    window.addEventListener('load', async () => {
        let reloading = false;
        const previousRegistration = await navigator.serviceWorker.getRegistration();

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!reloading && previousRegistration) {
                reloading = true;
                location.reload();
            }
        });

        const registration = await navigator.serviceWorker.register('/service-worker-v2.js');

        const forceUpdate = async () => {
            const confirmed =
                !previousRegistration ||
                (await confirm({
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
                }));
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
