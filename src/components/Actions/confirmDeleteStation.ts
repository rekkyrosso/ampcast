import {confirm} from 'components/Dialog';

export default async function confirmDeleteStation(name: string): Promise<boolean> {
    return confirm({
        icon: 'internet-radio',
        title: 'My Stations',
        message: `Remove station '${name}'?`,
        okLabel: 'Remove',
        storageId: 'remove-station',
        system: true
    });
}
