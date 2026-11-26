export interface CovensImport {
    version: 1;
    threads: {
        slot: number;
        id: string;
        paid: number;
        granted: number;
        paused: boolean;
    }[] | null;
    ember: string | null;
    atlas: {
        version: string;
        choices: {
            node: number;
            option: number | null;
        }[];
    } | null;
}
export declare function validCovensImport(value: unknown, league: string, tree: string | null): value is CovensImport;
