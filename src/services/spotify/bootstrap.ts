import mediaPlayer from 'services/mediaPlayback/mediaPlayer';
import spotifyAudioAnalyser from './spotifyAudioAnalyser';
import spotifyPlayer from './spotifyPlayer';

spotifyAudioAnalyser.player = spotifyPlayer;

mediaPlayer.registerPlayer(spotifyPlayer, (item) => !!item?.src.startsWith('spotify:'));
