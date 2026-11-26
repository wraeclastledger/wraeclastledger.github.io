import labels from './vendor/covens-card-labels.json';
import catalogue from './vendor/covens-catalogue.json';

const items: Record<string, string> = labels.items;
const nodes: Record<string, { name: string; options: { id: string; text: string }[] }> = labels.choices;

export function covensItemName(id: string) {
  return items[id] ?? id.replaceAll('-', ' ');
}

export function atlasChoiceLabel(version: string, nodeId: number, optionId: number | null) {
  const node = version === catalogue.tree ? nodes[nodeId] : undefined;
  const option = node?.options.find(candidate => candidate.id === String(optionId));
  const selection = optionId === null ? 'Selection unknown' : option?.text ?? `Unknown option (${optionId})`;
  return `${node?.name ?? `Unknown Atlas node (${nodeId})`} → ${selection}`;
}
