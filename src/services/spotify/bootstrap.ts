import mediaPlayer from 'services/mediaPlayback/mediaPlayer';
import spotifyAudioAnalyser from './spotifyAudioAnalyser';
import spotifyPlayer from './spotifyPlayer';

spotifyAudioAnalyser.player = spotifyPlayer;

mediaPlayer.addRadioPlayer(spotifyPlayer);
mediaPlayer.addPlayer(spotifyPlayer); // Do this last.
