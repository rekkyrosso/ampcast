import Log from 'types/Log';
import {Logger} from 'utils';
import useObservable from 'hooks/useObservable';

export default function useLogs(): readonly Log[] {
    return useObservable(Logger.observeLogs, Logger.logs);
}
