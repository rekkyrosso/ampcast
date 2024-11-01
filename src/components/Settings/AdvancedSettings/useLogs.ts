import Logger, {Log} from 'utils/Logger';
import useObservable from 'hooks/useObservable';

export default function useLogs(): readonly Log[] {
    return useObservable(Logger.observeLogs, Logger.logs);
}
