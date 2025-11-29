import useObservable from 'hooks/useObservable';
import ibroadcastSettings, {IBroadcastCredentials} from '../ibroadcastSettings';

export default function useCredentials(): IBroadcastCredentials {
    return useObservable(
        ibroadcastSettings.observeCredentials,
        ibroadcastSettings.getCredentials()
    );
}
