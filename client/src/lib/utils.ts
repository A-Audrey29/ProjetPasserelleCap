// Pure CSS utility functions without Tailwind dependencies

export type ClassValue = 
  | ClassArray
  | ClassDictionary
  | string
  | number
  | bigint
  | null
  | boolean
  | undefined;

export type ClassDictionary = Record<string, boolean | null | undefined>;
export type ClassArray = ClassValue[];

export function clsx(...inputs: ClassValue[]): string {
  let i = 0;
  let tmp: unknown;
  let x: ClassValue;
  let str = '';

  while (i < inputs.length) {
    if ((tmp = inputs[i++])) {
      if ((x = toValue(tmp))) {
        str && (str += ' ');
        str += x;
      }
    }
  }
  return str;
}

function toValue(input: unknown): string {
  if (typeof input === 'string' || typeof input === 'number') {
    return String(input);
  }

  if (typeof input !== 'object' || input === null) {
    return '';
  }

  if (Array.isArray(input)) {
    let i = 0;
    let tmp: unknown;
    let x: ClassValue;
    let str = '';

    while (i < input.length) {
      if ((tmp = input[i++])) {
        if ((x = toValue(tmp))) {
          str && (str += ' ');
          str += x;
        }
      }
    }
    return str;
  }

  let str = '';
  for (const key in input as ClassDictionary) {
    if ((input as ClassDictionary)[key]) {
      str && (str += ' ');
      str += key;
    }
  }
  return str;
}

// Simple class name utility without Tailwind merge
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}