import useObservable from 'hooks/useObservable';
import spotifySettings, {SpotifyCredentials} from '../spotifySettings';

export default function useCredentials(): SpotifyCredentials {
    return useObservable(spotifySettings.observeCredentials, spotifySettings.getCredentials());
}
