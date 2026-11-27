import { type StrategySetupCode } from './strategy-setup';
type Check<T> = (v: unknown) => T;
export declare const parseSafeRow: Check<{
    map_type: string | null;
    group_play: boolean | null;
    party_size: number | null;
    observed: {
        map_count: number | null;
        mod_average: number | null;
        mod_sample_size: number | null;
    };
    results: {
        all_in_cost_per_map_chaos: number | null;
        net_per_map_divines: number | null;
        net_divines_per_hour: number | null;
        total_invest_chaos: number | null;
        net_profit_chaos: number | null;
        historical_net_divines: number | null;
        historical_invest_divines: number | null;
    };
    evidence: {
        run_count: number | null;
        timed_run_count: number | null;
        timed_map_count: number | null;
    };
    id: string;
    title: string | null;
    tags: string[];
    league: string | null;
    attribution: {
        registration_id: string;
        display_name: string | null;
        status: "active" | "retired" | "removed" | "suspended" | "quarantined";
    } | null;
    community: {
        id: string;
        name: string;
    } | null;
    published_at: string | null;
    updated_at: string | null;
    score: number | null;
    schema_version: 2;
    scope: "current" | "frozen";
    snapshot_key: string | null;
    revision: number;
    read_version: string;
}>;
export declare const parseSafeRun: Check<{
    schema_version: 2;
    ordinal: number;
    contributed_on: string | null;
    setup: {
        map_type: string | null;
        group_play: boolean | null;
        party_size: number | null;
        chisel: string | null;
        scarabs: string[];
        delirium: {
            type: string | null;
            count_per_map: number | null;
        } | null;
        astrolabe: string | null;
        multiplying_modifiers: {
            allocated: boolean | null;
            fragment_count: number | null;
        } | null;
        game_data: {
            revision: number | null;
            patch_version: string | null;
        };
    };
    observed: {
        multiplier: number | null;
        quantity_average: number | null;
        rarity_average: number | null;
        pack_size_average: number | null;
        currency_average: number | null;
        map_count: number | null;
        mod_average: number | null;
        mod_sample_size: number | null;
    };
    economics: {
        recurring_cost_per_map_chaos: number | null;
        total_invest_chaos: number | null;
        net_profit_chaos: number | null;
        net_per_map_divines: number | null;
        divine_price_chaos: number | null;
    };
    timing: {
        reported_minutes: number | null;
    };
    cost_breakdown: {
        chisel: {
            name: string;
            price_each_chaos: number | null;
        } | null;
        scarabs: {
            name: string;
            price_each_chaos: number | null;
        }[];
        delirium: {
            type: string;
            count_per_map: number;
            price_each_chaos: number;
        } | null;
        astrolabe: {
            type: string;
            count: number;
            price_each_chaos: number;
        } | null;
    } | null;
    display_cost_breakdown: {
        chisel: {
            name: string;
            price_each_chaos: number | null;
        } | null;
        scarabs: {
            name: string;
            price_each_chaos: number | null;
        }[];
        delirium: {
            type: string;
            count_per_map: number;
            price_each_chaos: number;
        } | null;
        astrolabe: {
            type: string;
            count: number;
            price_each_chaos: number;
        } | null;
    } | null;
    observed_delirium: {
        sample_size: number;
        levels: {
            percentage: number;
            count: number;
        }[];
        rewards: {
            name: string;
            count: number;
        }[];
    } | null;
    loot: {
        version: 1;
        row_limit: 30;
        rows: {
            name: string;
            category: string;
            source: string;
            quantity: number;
            value_chaos: number;
            note: string | null;
            valuation: {
                baseline_quantity: number;
                current_quantity: number;
                baseline_value_chaos: number;
                current_value_chaos: number;
            } | null;
            identity: Record<string, string | number | null> | null;
        }[];
        categories: {
            category: string;
            value_chaos: number;
        }[];
        has_baseline: boolean;
        manual_total_chaos: number | null;
        inventory_flow_chaos: number | null;
        market_revaluation_chaos: number | null;
        csv_positive_chaos: number;
        csv_negative_chaos: number;
        csv_net_chaos: number;
        csv_adjustment_chaos: number;
        gem_correction_chaos: number;
        investment_correction_chaos: number;
        reported_return_chaos: number;
        omitted_csv_rows: number | null;
        omitted_csv_value_chaos: number | null;
        omitted_manual_rows: number | null;
        omitted_manual_value_chaos: number | null;
    } | null;
}>;
export declare const parseSafeDetail: Check<{
    notes: string | null;
    setup: {
        scarabs: {
            name: string;
            price_each_chaos: number | null;
        }[];
        atlas: {
            url: string | null;
            points: number | null;
            points_max: number | null;
        };
        run_regex: string | null;
        slam_regex: string | null;
        map_type: string | null;
        group_play: boolean | null;
        party_size: number | null;
        chisel: string | null;
        delirium: {
            type: string | null;
            count_per_map: number | null;
        } | null;
        astrolabe: string | null;
        multiplying_modifiers: {
            allocated: boolean | null;
            fragment_count: number | null;
        } | null;
        game_data: {
            revision: number | null;
            patch_version: string | null;
        };
    };
    observed: {
        multiplier_average: number | null;
        quantity_average: number | null;
        rarity_average: number | null;
        pack_size_average: number | null;
        currency_average: number | null;
        map_count: number | null;
        mod_average: number | null;
        mod_sample_size: number | null;
    };
    economics: {
        all_in_cost_per_map_chaos: number | null;
        recurring_cost_per_map_chaos: number | null;
        net_per_map_divines: number | null;
        historical_net_divines: number | null;
        historical_invest_divines: number | null;
        total_invest_chaos: number | null;
        net_profit_chaos: number | null;
    };
    coverage: {
        run_count: number | null;
        map_count: number | null;
        timed_run_count: number | null;
        timed_map_count: number | null;
        timed_minutes: number | null;
        timed_net_divines: number | null;
        net_divines_per_hour: number | null;
        loot_available: boolean;
    };
    loot: {
        version: 1;
        row_limit: 30;
        rows: {
            name: string;
            category: string;
            source: string;
            quantity: number;
            value_chaos: number;
            note: string | null;
            valuation: {
                baseline_quantity: number;
                current_quantity: number;
                baseline_value_chaos: number;
                current_value_chaos: number;
            } | null;
            identity: Record<string, string | number | null> | null;
        }[];
        categories: {
            category: string;
            value_chaos: number;
        }[];
        has_baseline: boolean;
        manual_total_chaos: number | null;
        inventory_flow_chaos: number | null;
        market_revaluation_chaos: number | null;
        csv_positive_chaos: number;
        csv_negative_chaos: number;
        csv_net_chaos: number;
        csv_adjustment_chaos: number;
        gem_correction_chaos: number;
        investment_correction_chaos: number;
        reported_return_chaos: number;
        omitted_csv_rows: number | null;
        omitted_csv_value_chaos: number | null;
        omitted_manual_rows: number | null;
        omitted_manual_value_chaos: number | null;
    } | null;
    reusable_setup: {
        status: "available";
        value: StrategySetupCode;
    } | {
        status: "unavailable";
        reason: string;
    };
    authored_history: {
        observed: {
            multiplier: number | null;
            quantity_average: number | null;
            rarity_average: number | null;
            pack_size_average: number | null;
            currency_average: number | null;
            map_count: number | null;
            mod_average: number | null;
            mod_sample_size: number | null;
        };
        economics: {
            recurring_cost_per_map_chaos: number | null;
            total_invest_chaos: number | null;
            net_profit_chaos: number | null;
            net_per_map_divines: number | null;
            divine_price_chaos: number | null;
        };
        timing: {
            reported_minutes: number | null;
        };
        setup_display: {
            source: "structured" | "legacy_display";
            authored_map_count: number | null;
            cost_breakdown: {
                chisel: {
                    name: string;
                    price_each_chaos: number | null;
                } | null;
                scarabs: {
                    name: string;
                    price_each_chaos: number | null;
                }[];
                delirium: {
                    type: string;
                    count_per_map: number;
                    price_each_chaos: number;
                } | null;
                astrolabe: {
                    type: string;
                    count: number;
                    price_each_chaos: number;
                } | null;
            } | null;
            combined_map_rolling_cost_per_map_chaos: number | null;
        } | null;
    } | null;
    ancillary: {
        excluded_drops: {
            entries: {
                name: string;
                chaos: number | null;
            }[];
            declared_count: number | null;
            total_chaos: number | null;
            complete: boolean;
        } | null;
        gem_leveling: {
            count: number | null;
            buy_chaos: number | null;
            sell_chaos: number | null;
            net_chaos: number | null;
        } | null;
        observed_delirium: {
            sample_size: number;
            levels: {
                percentage: number;
                count: number;
            }[];
            rewards: {
                name: string;
                count: number;
            }[];
        } | null;
    };
    continuation_setup: {
        status: "available";
        identity_version: 1 | 2;
        seed: {
            league_key: string;
            multiplier_milli: number;
            atlas_tree_url: string | null;
            map_type: string | null;
            group_play: boolean | null;
            party_size: number | null;
            chisel: string | null;
            scarabs: string[];
            delirium: {
                type: string | null;
                count_per_map: number | null;
            } | null;
            astrolabe: string | null;
            multiplying_modifiers: {
                allocated: boolean | null;
                fragment_count: number | null;
            } | null;
            game_data: {
                revision: number | null;
                patch_version: string | null;
            };
        };
    } | {
        status: "unavailable";
        reason: "frozen" | "missing_membership" | "incomplete_seed" | "conflicting_seed" | "unsupported_identity" | "inactive_registration";
    };
    lifecycle: {
        state: "current" | "frozen";
        continuation_reason: "frozen" | "missing_membership" | "incomplete_seed" | "conflicting_seed" | "unsupported_identity" | "inactive_registration" | null;
    };
    id: string;
    title: string | null;
    tags: string[];
    league: string | null;
    attribution: {
        registration_id: string;
        display_name: string | null;
        status: "active" | "retired" | "removed" | "suspended" | "quarantined";
    } | null;
    community: {
        id: string;
        name: string;
    } | null;
    published_at: string | null;
    updated_at: string | null;
    score: number | null;
    schema_version: 2;
    scope: "current" | "frozen";
    snapshot_key: string | null;
    revision: number;
    read_version: string;
}>;
export declare const SAFE_SORTS: {
    readonly activity: "Latest activity";
    readonly title: "Strategy name";
    readonly mod: "Mod";
    readonly maps: "Maps";
    readonly cost_per_map: "Cost / map";
    readonly profit_per_map: "Div / map";
    readonly net_profit: "Net profit";
    readonly total_invest: "Total investment";
    readonly score: "Score";
    readonly div_per_hour: "Div / hour";
};
export type SafeSort = keyof typeof SAFE_SORTS;
export declare const safeSortOrder: (sort: SafeSort) => "asc" | "desc";
export declare const parseSafeList: Check<{
    schema_version: 2;
    scope: "current" | "frozen";
    snapshot_key: string | null;
    read_version: string;
    total: number;
    limit: number;
    sort: "title" | "maps" | "score" | "activity" | "mod" | "cost_per_map" | "profit_per_map" | "net_profit" | "total_invest" | "div_per_hour";
    order: "asc" | "desc";
    strategies: {
        map_type: string | null;
        group_play: boolean | null;
        party_size: number | null;
        observed: {
            map_count: number | null;
            mod_average: number | null;
            mod_sample_size: number | null;
        };
        results: {
            all_in_cost_per_map_chaos: number | null;
            net_per_map_divines: number | null;
            net_divines_per_hour: number | null;
            total_invest_chaos: number | null;
            net_profit_chaos: number | null;
            historical_net_divines: number | null;
            historical_invest_divines: number | null;
        };
        evidence: {
            run_count: number | null;
            timed_run_count: number | null;
            timed_map_count: number | null;
        };
        id: string;
        title: string | null;
        tags: string[];
        league: string | null;
        attribution: {
            registration_id: string;
            display_name: string | null;
            status: "active" | "retired" | "removed" | "suspended" | "quarantined";
        } | null;
        community: {
            id: string;
            name: string;
        } | null;
        published_at: string | null;
        updated_at: string | null;
        score: number | null;
        schema_version: 2;
        scope: "current" | "frozen";
        snapshot_key: string | null;
        revision: number;
        read_version: string;
    }[];
    next_cursor: string | null;
}>;
export declare const parseSafeEvidence: Check<{
    schema_version: 2;
    strategy_id: string;
    revision: number;
    read_version: string;
    runs: {
        schema_version: 2;
        ordinal: number;
        contributed_on: string | null;
        setup: {
            map_type: string | null;
            group_play: boolean | null;
            party_size: number | null;
            chisel: string | null;
            scarabs: string[];
            delirium: {
                type: string | null;
                count_per_map: number | null;
            } | null;
            astrolabe: string | null;
            multiplying_modifiers: {
                allocated: boolean | null;
                fragment_count: number | null;
            } | null;
            game_data: {
                revision: number | null;
                patch_version: string | null;
            };
        };
        observed: {
            multiplier: number | null;
            quantity_average: number | null;
            rarity_average: number | null;
            pack_size_average: number | null;
            currency_average: number | null;
            map_count: number | null;
            mod_average: number | null;
            mod_sample_size: number | null;
        };
        economics: {
            recurring_cost_per_map_chaos: number | null;
            total_invest_chaos: number | null;
            net_profit_chaos: number | null;
            net_per_map_divines: number | null;
            divine_price_chaos: number | null;
        };
        timing: {
            reported_minutes: number | null;
        };
        cost_breakdown: {
            chisel: {
                name: string;
                price_each_chaos: number | null;
            } | null;
            scarabs: {
                name: string;
                price_each_chaos: number | null;
            }[];
            delirium: {
                type: string;
                count_per_map: number;
                price_each_chaos: number;
            } | null;
            astrolabe: {
                type: string;
                count: number;
                price_each_chaos: number;
            } | null;
        } | null;
        display_cost_breakdown: {
            chisel: {
                name: string;
                price_each_chaos: number | null;
            } | null;
            scarabs: {
                name: string;
                price_each_chaos: number | null;
            }[];
            delirium: {
                type: string;
                count_per_map: number;
                price_each_chaos: number;
            } | null;
            astrolabe: {
                type: string;
                count: number;
                price_each_chaos: number;
            } | null;
        } | null;
        observed_delirium: {
            sample_size: number;
            levels: {
                percentage: number;
                count: number;
            }[];
            rewards: {
                name: string;
                count: number;
            }[];
        } | null;
        loot: {
            version: 1;
            row_limit: 30;
            rows: {
                name: string;
                category: string;
                source: string;
                quantity: number;
                value_chaos: number;
                note: string | null;
                valuation: {
                    baseline_quantity: number;
                    current_quantity: number;
                    baseline_value_chaos: number;
                    current_value_chaos: number;
                } | null;
                identity: Record<string, string | number | null> | null;
            }[];
            categories: {
                category: string;
                value_chaos: number;
            }[];
            has_baseline: boolean;
            manual_total_chaos: number | null;
            inventory_flow_chaos: number | null;
            market_revaluation_chaos: number | null;
            csv_positive_chaos: number;
            csv_negative_chaos: number;
            csv_net_chaos: number;
            csv_adjustment_chaos: number;
            gem_correction_chaos: number;
            investment_correction_chaos: number;
            reported_return_chaos: number;
            omitted_csv_rows: number | null;
            omitted_csv_value_chaos: number | null;
            omitted_manual_rows: number | null;
            omitted_manual_value_chaos: number | null;
        } | null;
    }[];
    next_cursor: string | null;
}>;
export declare const parseSafeCatalogue: Check<{
    schema_version: 2;
    snapshots: {
        snapshot_key: string;
        read_version: string;
        league: string | null;
        cutoff_utc: string | null;
        frozen_at: string | null;
        strategy_count: number;
    }[];
}>;
export type SafeRow = ReturnType<typeof parseSafeRow>;
export type SafeDetail = ReturnType<typeof parseSafeDetail>;
export type SafeRun = ReturnType<typeof parseSafeRun>;
export type SafeList = ReturnType<typeof parseSafeList>;
export type SafeSnapshot = ReturnType<typeof parseSafeCatalogue>['snapshots'][number];
export type SafeIdentity = Pick<SafeRow, 'scope' | 'snapshot_key' | 'id' | 'revision' | 'read_version'>;
export declare const safeIdentityKey: (i: SafeIdentity) => string;
export declare const sameSafeIdentity: (a: SafeIdentity, b: SafeIdentity) => boolean;
