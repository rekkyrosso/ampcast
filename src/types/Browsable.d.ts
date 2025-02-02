import {SetRequired} from 'type-fest';
import MediaService from './MediaService';

type Browsable<T extends MediaService> = SetRequired<T, 'root'>;

export default Browsable;
