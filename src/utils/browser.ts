import {detect} from 'detect-browser';

const browser = detect();
const name = browser?.name || 'unknown';
const displayName = /^edge/.test(name)
    ? 'Microsoft Edge'
    : name.replace(/^\w/, (char) => char.toUpperCase());
const version = browser?.version || '0';
const os = browser?.os || 'unknown';

export default {
    name,
    displayName,
    version,
    os,
};
