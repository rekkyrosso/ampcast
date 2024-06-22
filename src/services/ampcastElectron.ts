import AmpcastElectron from 'types/AmpcastElectron';
import {browser} from 'utils';

const ampcastElectron: AmpcastElectron | undefined = browser.isElectron
    ? (globalThis as any)['ampcastElectron']
    : undefined;

export default ampcastElectron;
