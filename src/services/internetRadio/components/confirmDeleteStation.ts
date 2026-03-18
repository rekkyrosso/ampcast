import {confirm} from 'components/Dialog';

export default async function confirmDeleteStation(name: string): Promise<boolean> {
    return confirm({
        icon: 'internet-radio',
        title: 'My Stations',
        message: `Delete station '${name}'?`,
        okLabel: 'Delete',
        storageId: 'delete-station',
        system: true
    });
}
