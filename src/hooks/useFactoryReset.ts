import {useCallback} from 'react';
import {exists} from 'utils';
import ampcastElectron from 'services/ampcastElectron';
import {getServices} from 'services/mediaServices';

export default function useFactoryReset() {
    return useCallback(async () => {
        try {
            const registration = await navigator.serviceWorker?.getRegistration();
            await registration?.unregister();
        } catch (err) {
            console.error(err);
        }
        try {
            await Promise.all(getServices().map((service) => service.logout()));
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
        try {
            await ampcastElectron?.clearCredentials();
        } catch (err) {
            console.error(err);
        }
    }, []);
}
