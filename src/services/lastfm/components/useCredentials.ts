import useObservable from 'hooks/useObservable';
import lastfmSettings, {LastFmCredentials} from '../lastfmSettings';

export default function useCredentials(): LastFmCredentials {
    return useObservable(lastfmSettings.observeCredentials, lastfmSettings.getCredentials());
}
