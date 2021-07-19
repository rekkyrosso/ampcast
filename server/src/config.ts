import {resolve} from 'path';

export const rootDir = resolve(__dirname, '../');
export const tempDir = resolve(rootDir, './temp');
export const logsDir = resolve(rootDir, './logs');

export const webDir = resolve(rootDir, '../build');
export const webIndex = resolve(webDir, './index.html');
export const webPort = 80;

export const dbName = resolve(rootDir, './media.sqlite');

export default {
    rootDir,
    tempDir,
    logsDir,
    webDir,
    webIndex,
    webPort,
    dbName,
};
