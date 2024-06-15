import useObservable from 'hooks/useObservable';
import appleSettings, {AppleCredentials} from '../appleSettings';

export default function useCredentials(): AppleCredentials {
    return useObservable(appleSettings.observeCredentials, appleSettings.getCredentials());
}
