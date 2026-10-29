import type { Language } from '../domain/types';
import id from './id.json';
import en from './en.json';

const dictionaries: Record<Language, Record<string, string>> = { id, en };
const owns = (dictionary: Record<string, string>, key: string) =>
  Object.prototype.hasOwnProperty.call(dictionary, key);

/** The shipped dictionary uses flat keys and plain text; Indonesian remains the fallback. */
export function translateKey(locale: Language, key: string): string {
  const dictionary = dictionaries[locale];
  if (owns(dictionary, key)) return dictionary[key];
  return owns(id, key) ? (id as Record<string, string>)[key] : key;
}
