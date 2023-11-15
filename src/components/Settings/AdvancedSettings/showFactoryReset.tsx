import React from 'react';
import {getEnabledServices} from 'services/mediaServices';
import {confirm} from 'components/Dialog';
import {exists} from 'utils';

export default async function showFactoryReset(): Promise<void> {
    const confirmed = await confirm({
        title: 'Factory Reset',
        message: (
            <p>
                This will delete all of your current settings
                <br />
                and disconnect you from all services.
            </p>
        ),
        okLabel: 'Continue',
        system: true,
    });

    if (confirmed) {
        try {
            await Promise.all(
                getEnabledServices()
                    .filter((service) => service.isConnected())
                    .map((service) => service.logout())
            );
        } catch (err) {
            console.error(err);
        }
        localStorage.clear();
        sessionStorage.clear();
        try {
            const databases = await indexedDB.databases();
            await Promise.all(
                databases
                    .map((db) => db.name)
                    .filter(exists)
                    .map((name) => indexedDB.deleteDatabase(name))
            );
        } catch (err) {
            console.error(err);
        }
        location.reload();
    }
}
