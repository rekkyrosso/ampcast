import mediaPlayer from 'services/mediaPlayback/mediaPlayer';
import tidalPlayer from './tidalPlayer';

mediaPlayer.registerPlayer(tidalPlayer, (item) => !!item?.src.startsWith('tidal:'));
