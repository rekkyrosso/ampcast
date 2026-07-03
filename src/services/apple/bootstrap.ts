import mediaPlayer from 'services/mediaPlayback/mediaPlayer';
import musicKitPlayer from './musicKitPlayer';

mediaPlayer.addRadioPlayer(musicKitPlayer);
mediaPlayer.addPlayer(musicKitPlayer); // Do this last.
