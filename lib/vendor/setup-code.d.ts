export function generatePublicStrategySetupCode(detail:unknown,evidence:unknown,encode:(payload:string)=>Promise<string>|string):Promise<{status:'available';code:string;sourceEvidenceOrdinal:number}|{status:'unavailable';reason:'incomplete_safe_source'|'encoding_failed'}>;
export function isSafeStrategyAtlasUrl(value:unknown):boolean;
