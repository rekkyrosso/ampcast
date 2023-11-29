import DRMKeySystem from './DRMKeySystem';
import DRMType from './DRMType';

export default interface DRMInfo {
    readonly type: DRMType;
    readonly keySystem: DRMKeySystem;
    readonly certificate?: string;
    readonly license?: string;
}
