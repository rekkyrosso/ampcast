import useObservable from 'hooks/useObservable';
import soundcloudSettings, {SoundCloudCredentials} from '../soundcloudSettings';

export default function useCredentials(): SoundCloudCredentials {
    return useObservable(
        soundcloudSettings.observeCredentials,
        soundcloudSettings.getCredentials()
    );
}
