import mediaPlayer from 'services/mediaPlayback/mediaPlayer';
import plexRadioPlayer from './plexRadioPlayer';

mediaPlayer.registerPlayer(plexRadioPlayer, (item) => !!item?.src.startsWith('plex:radio:'));
