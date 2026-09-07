import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { leagueOptions } from '../lib/league-options';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverTitle,
} from './ui/popover';
export function LeagueFilter({
  value,
  leagues,
  onChange,
}: {
  value: string;
  leagues: string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState('');
  const options = leagueOptions(leagues, value);
  const choose = (league: string) => {
    onChange(league);
    setOpen(false);
  };
  const filtered = options.filter((x) =>
    x.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <div className="league-filter">
      <span className="filter-label">League</span>
      <Popover
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (value) setSearch('');
        }}
      >
        <PopoverTrigger
          type="button"
          className="mechanic-trigger"
          aria-label={`League: ${value || 'All leagues'}`}
        >
          <span>{value || 'All leagues'}</span>
          <ChevronDown size={14} />
        </PopoverTrigger>
        <PopoverContent className="league-menu" align="start">
          <PopoverTitle>Choose league</PopoverTitle>
          <input
            aria-label="Search leagues"
            placeholder="Search leagues…"
            value={search}
            maxLength={80}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                choose(filtered.length === 1 ? filtered[0] : search.trim());
              }
            }}
          />
          <div className="league-options">
            <button type="button" onClick={() => choose('')}>
              All leagues {!value && <Check size={13} />}
            </button>
            {filtered.map((x) => (
              <button type="button" key={x} onClick={() => choose(x)}>
                {x}
                {x === value && <Check size={13} />}
              </button>
            ))}
            {search.trim() &&
              !options.some(
                (x) => x.toLowerCase() === search.trim().toLowerCase(),
              ) && (
                <button type="button" onClick={() => choose(search.trim())}>
                  Search “{search.trim()}”
                </button>
              )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
