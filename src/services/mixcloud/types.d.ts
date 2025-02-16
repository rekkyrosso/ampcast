declare namespace Mixcloud {
    interface Cloudcast {
        readonly type: 'cloudcast';
        readonly key: string;
        readonly url: string;
        readonly name: string;
        readonly audio_length: number; // seconds
        readonly tags: readonly Tag[];
        readonly created_time: string; // ISO
        readonly updated_time: string;
        readonly play_count: number;
        readonly favorite_count: number;
        readonly listener_count: number;
        readonly pictures: Record<string, string>;
        readonly description: string;
        readonly picture_primary_color: string;
        readonly user: User;
    }

    interface User {
        readonly type: 'user';
        readonly key: string;
        readonly url: string;
        readonly name: string;
        readonly username: string;
        readonly pictures: Record<string, string>;
    }

    interface Tag {
        readonly key: string;
        readonly url: string;
        readonly name: string;
    }
}
