import {detect} from 'detect-browser';
import isElectron from 'is-electron';

const browser = detect();
const name = browser?.name || 'unknown';
const displayName = /^edge/.test(name)
    ? 'Microsoft Edge'
    : name.replace(/^\w/, (char) => char.toUpperCase());
const version = browser?.version || '0';
const os = browser?.os || 'unknown';
const cmdKey: keyof KeyboardEvent = os === 'Mac OS' ? 'metaKey' : 'ctrlKey';
const cmdKeyStr = os === 'Mac OS' ? '⌘' : 'Ctrl';
const desktop = !/^(iOS|Android OS|BlackBerry OS|Windows Mobile|Amazon OS)$/.test(os);

export default {
    name,
    displayName,
    version,
    os,
    desktop,
    cmdKey,
    cmdKeyStr,
    isElectron: isElectron()
};
