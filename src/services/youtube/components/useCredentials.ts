import useObservable from 'hooks/useObservable';
import youtubeSettings, {YouTubeCredentials} from '../youtubeSettings';

export default function useCredentials(): YouTubeCredentials {
    return useObservable(youtubeSettings.observeCredentials, youtubeSettings.getCredentials());
}
