import useObservable from 'hooks/useObservable';
import tidalSettings, {TidalCredentials} from '../tidalSettings';

export default function useCredentials(): TidalCredentials {
    return useObservable(tidalSettings.observeCredentials, tidalSettings.getCredentials());
}
