import mediaPlayer from 'services/mediaPlayback/mediaPlayer';
import musicKitPlayer from './musicKitPlayer';

mediaPlayer.registerPlayer(musicKitPlayer, (item) => !!item?.src.startsWith('apple:'));
