import { ChevronDown } from 'lucide-react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverTitle,
  PopoverDescription,
} from './ui/popover';
export const MECHANICS = [
  'bestiary',
  'harvest',
  'anarchy',
  'trarthus',
  'kalguur',
  'delirium',
  'legion',
  'breach',
  'abyss',
  'expedition',
  'blight',
  'ritual',
  'ultimatum',
  'strongbox',
  'essence',
  'beyond',
  'sentinel',
  'mirage',
  'mirage-rush',
  'wildwood',
  'shrine',
  'torment',
  'harbinger',
  'metamorph',
  'titanic',
  'astrolabe-immortal',
  'astrolabe-feral',
  'astrolabe-royal',
  'astrolabe-cryptic',
];
const name = (tag: string) =>
  tag.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
export function MechanicFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = value.split(',').filter(Boolean);
  return (
    <div className="mechanic-filter">
      <span id="mechanic-label" className="filter-label">
        Mechanics
      </span>
      <Popover>
        <PopoverTrigger
          type="button"
          className="mechanic-trigger"
          aria-label={`Mechanics: ${selected.length ? selected.map(name).join(', ') : 'Any mechanic'}`}
        >
          <span>
            {selected.length > 1
              ? `${selected.length} selected`
              : selected.length
                ? name(selected[0])
                : 'Any mechanic'}
          </span>
          <ChevronDown size={14} />
        </PopoverTrigger>
        <PopoverContent className="mechanic-popup" align="start">
          <PopoverTitle>Mechanics</PopoverTitle>
          <PopoverDescription>Match any selected mechanic.</PopoverDescription>
          <div className="mechanic-options">
            {[...new Set([...MECHANICS, ...selected])].map((tag) => (
              <label key={tag}>
                <input
                  type="checkbox"
                  checked={selected.includes(tag)}
                  disabled={selected.length >= 24 && !selected.includes(tag)}
                  onChange={(event) =>
                    onChange(
                      (event.target.checked
                        ? [...selected, tag]
                        : selected.filter((t) => t !== tag)
                      ).join(','),
                    )
                  }
                />
                <span>{name(tag)}</span>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            disabled={!selected.length}
          >
            Clear mechanics
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
