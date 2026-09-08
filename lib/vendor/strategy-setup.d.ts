export declare const SETUP_CODE_PREFIX = "wls1.";
export declare const SETUP_CODE_MIN_APP_VERSION = "1.0.97";
export declare const SETUP_CODE_MAX_LENGTH = 32768;
/** Reusable setup only. This is not a Discord submission or a historical run. */
export interface StrategySetupCode {
    version: 1;
    kind: 'setup';
    title: string;
    notes: string;
    league: string;
    mapType: '6-mod' | '8-mod';
    chisel: string | null;
    scarabs: string[];
    delirium: {
        type: string;
        countPerMap: number | null;
    } | null;
    astrolabe: string | null;
    atlasTreeUrl: string | null;
    runRegex: string;
    reference?: SetupReference;
    multiplyingModifiers?: {
        allocated: boolean | null;
        fragmentCount: number | null;
    };
    party?: {
        group: boolean | null;
        size: number | null;
    };
    /** Optional, unverified public display snapshot. Never applied to a session. */
    history?: SetupHistory;
}
/** Recorded guidance, never new Map Log entries or financial inputs. */
export interface SetupReference {
    maps: number | null;
    quantity: number | null;
    rarity: number | null;
    packSize: number | null;
    currency: number | null;
    mapFamily: string | null;
    slamRegex: string;
}
export interface SetupHistory {
    maps: number | null;
    runs: number | null;
    quantity: number | null;
    rarity: number | null;
    packSize: number | null;
    currency: number | null;
    multiplier: number | null;
    costPerMap: number | null;
    totalInvest: number | null;
    netProfit: number | null;
    historicalInvestDivines: number | null;
    historicalNetDivines: number | null;
    netPerMapDivines: number | null;
    divinePrice: number | null;
    minutes: number | null;
    timedMaps: number | null;
    atlasPoints: number | null;
    atlasPointsMax: number | null;
    scarabPrices: (number | null)[];
}
export declare function isStrategySetupCode(value: unknown): value is StrategySetupCode;
export declare function encodeStrategySetupCode(value: StrategySetupCode): string;
export declare function decodeStrategySetupCode(input: string): StrategySetupCode | null;
/** Explicit public projection: reusable fields plus a separate inspection-only snapshot. */
export declare function publicStrategySetup(detail: unknown, evidence?: unknown): StrategySetupCode | null;
