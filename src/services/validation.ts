import type { FieldError } from '../domain/types';

/**
 * Minimal JSON-Schema validator covering exactly the keywords used by the
 * OfferProof tool contracts (docs/webmcp/TOOL_CONTRACTS.md). Unknown fields
 * are rejected, never silently ignored.
 */
export interface JsonSchema {
  type?: 'object' | 'string' | 'boolean' | 'array' | 'integer' | 'number';
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  pattern?: string;
  enum?: readonly unknown[];
  const?: unknown;
  default?: unknown;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  items?: JsonSchema;
  minLength?: number;
  maxLength?: number;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateInput(schema: JsonSchema, value: unknown, path = '$'): FieldError[] {
  const errors: FieldError[] = [];
  const fail = (code: string, message: string) => errors.push({ path, code, message });

  if (schema.const !== undefined && value !== schema.const) {
    fail('INVALID_CONST', `${path} 값은 ${JSON.stringify(schema.const)} 이어야 합니다.`);
    return errors;
  }
  if (schema.enum && !schema.enum.includes(value)) {
    fail('INVALID_ENUM', `${path} 값은 허용된 목록(${schema.enum.map((v) => String(v)).join(', ')}) 중 하나여야 합니다.`);
    return errors;
  }

  switch (schema.type) {
    case 'object': {
      if (!isPlainObject(value)) {
        fail('INVALID_TYPE', `${path} 값은 객체여야 합니다.`);
        return errors;
      }
      const props = schema.properties ?? {};
      for (const key of schema.required ?? []) {
        if (!(key in value) || value[key] === undefined) {
          errors.push({ path: `${path}.${key}`, code: 'REQUIRED', message: `${path}.${key} 필드가 필요합니다.` });
        }
      }
      for (const key of Object.keys(value)) {
        if (!(key in props)) {
          if (schema.additionalProperties === false) {
            errors.push({ path: `${path}.${key}`, code: 'UNKNOWN_FIELD', message: `${path}.${key} 필드는 허용되지 않습니다.` });
          }
          continue;
        }
        if (value[key] === undefined) continue;
        errors.push(...validateInput(props[key], value[key], `${path}.${key}`));
      }
      return errors;
    }
    case 'string': {
      if (typeof value !== 'string') {
        fail('INVALID_TYPE', `${path} 값은 문자열이어야 합니다.`);
        return errors;
      }
      if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
        fail('INVALID_FORMAT', `${path} 형식이 올바르지 않습니다.`);
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        fail('TOO_LONG', `${path} 길이는 ${schema.maxLength}자를 넘을 수 없습니다.`);
      }
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        fail('TOO_SHORT', `${path} 길이는 최소 ${schema.minLength}자여야 합니다.`);
      }
      return errors;
    }
    case 'boolean': {
      if (typeof value !== 'boolean') fail('INVALID_TYPE', `${path} 값은 true 또는 false여야 합니다.`);
      return errors;
    }
    case 'integer':
    case 'number': {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        fail('INVALID_TYPE', `${path} 값은 숫자여야 합니다.`);
      } else if (schema.type === 'integer' && !Number.isInteger(value)) {
        fail('INVALID_TYPE', `${path} 값은 정수여야 합니다.`);
      }
      return errors;
    }
    case 'array': {
      if (!Array.isArray(value)) {
        fail('INVALID_TYPE', `${path} 값은 배열이어야 합니다.`);
        return errors;
      }
      if (schema.minItems !== undefined && value.length < schema.minItems) {
        fail('TOO_FEW', `${path} 항목은 최소 ${schema.minItems}개여야 합니다.`);
      }
      if (schema.maxItems !== undefined && value.length > schema.maxItems) {
        fail('TOO_MANY', `${path} 항목은 최대 ${schema.maxItems}개까지 허용됩니다.`);
      }
      if (schema.uniqueItems) {
        const seen = new Set<string>();
        for (const item of value) {
          const key = JSON.stringify(item);
          if (seen.has(key)) {
            fail('DUPLICATE', `${path} 항목에 중복이 있습니다.`);
            break;
          }
          seen.add(key);
        }
      }
      if (schema.items) {
        value.forEach((item, index) => {
          errors.push(...validateInput(schema.items as JsonSchema, item, `${path}[${index}]`));
        });
      }
      return errors;
    }
    default:
      return errors;
  }
}
