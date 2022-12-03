declare namespace coverart {
    interface Image {
        approved: boolean;
        back: boolean;
        front: boolean;
        id: number;
        thumbnails: Record<string, string>;
    }

    interface Response {
        images: readonly Image[];
        release: string;
    }
}
