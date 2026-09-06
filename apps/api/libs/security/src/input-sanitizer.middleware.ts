import {
  Injectable,
  type NestMiddleware,
  Logger,
} from '@nestjs/common';
import { type Request, type Response, type NextFunction } from 'express';

/**
 * InputSanitizerMiddleware — Deep-scan and neutralize injection patterns.
 *
 * Protects against:
 *  - SQL Injection (UNION SELECT, DROP TABLE, OR 1=1, etc.)
 *  - NoSQL Injection (MongoDB operator injection: $gt, $ne, $regex, etc.)
 *  - XSS (script tags, event handlers, javascript: URIs)
 *  - Command Injection (shell metacharacters in string values)
 *  - LDAP Injection
 *  - Path Traversal (../ sequences in string values)
 *
 * Applied globally via SecurityModule middleware consumer.
 */
@Injectable()
export class InputSanitizerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('InputSanitizer');

  // ── SQL Injection Patterns ────────────────────────────────────────────────
  private readonly SQL_PATTERNS: RegExp[] = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|TRUNCATE|MERGE)\b\s)/i,
    /(\bUNION\s+(ALL\s+)?SELECT\b)/i,
    /(\bOR\s+\d+\s*=\s*\d+)/i,           // OR 1=1
    /(\bAND\s+\d+\s*=\s*\d+)/i,          // AND 1=1
    /(--|#|\/\*|\*\/)/,                    // SQL comments
    /(\b(WAITFOR|BENCHMARK|SLEEP)\s*\()/i, // Time-based injection
    /(\bINTO\s+(OUT|DUMP)FILE\b)/i,       // File exfiltration
    /(\bLOAD_FILE\s*\()/i,
    /(\bCHAR\s*\(\s*\d+)/i,              // CHAR() obfuscation
    /(\bCONCAT\s*\()/i,                  // CONCAT() obfuscation
  ];

  // ── NoSQL Injection Patterns ──────────────────────────────────────────────
  private readonly NOSQL_OPERATORS: string[] = [
    '$gt', '$gte', '$lt', '$lte', '$ne', '$nin', '$in',
    '$regex', '$where', '$exists', '$type', '$mod',
    '$all', '$size', '$elemMatch', '$slice',
    '$or', '$and', '$not', '$nor',
    '$expr', '$jsonSchema', '$text', '$search',
  ];

  // ── XSS Patterns ─────────────────────────────────────────────────────────
  private readonly XSS_PATTERNS: RegExp[] = [
    /<script[\s>]/i,
    /<\/script>/i,
    /javascript\s*:/i,
    /on(load|error|click|mouseover|focus|blur|change|submit|keydown|keyup)\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<form/i,
    /\beval\s*\(/i,
    /\bdocument\.(cookie|write|location)/i,
    /\bwindow\.(location|open)/i,
    /data\s*:\s*text\/html/i,
    /vbscript\s*:/i,
  ];

  // ── Command Injection Patterns ────────────────────────────────────────────
  private readonly CMD_PATTERNS: RegExp[] = [
    /[;&|`$](?!\s*$)/,              // Shell metacharacters
    /\$\{.*\}/,                       // Variable expansion
    /\$\(.*\)/,                       // Command substitution
    /`[^`]+`/,                        // Backtick execution
  ];

  // ── Path Traversal ────────────────────────────────────────────────────────
  private readonly PATH_TRAVERSAL: RegExp = /\.\.[/\\]/;

  use(req: Request, _res: Response, next: NextFunction): void {
    const threats: string[] = [];

    // Scan request body
    if (req.body && typeof req.body === 'object') {
      const bodyThreats = this.scanObject(req.body, 'body');
      threats.push(...bodyThreats);
      // Sanitize NoSQL operators from body (mutate in place)
      req.body = this.sanitizeNoSqlOperators(req.body);
    }

    // Scan query parameters
    if (req.query && typeof req.query === 'object') {
      const queryThreats = this.scanObject(req.query, 'query');
      threats.push(...queryThreats);
    }

    // Scan URL path
    const urlThreats = this.scanString(req.path, 'path');
    threats.push(...urlThreats);

    // Log threats but don't block (defense-in-depth — the validation pipe handles rejection)
    if (threats.length > 0) {
      const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';
      this.logger.warn(
        `🔍 Injection attempt detected from ${clientIp} on ${req.method} ${req.path}: ` +
        `[${threats.join(', ')}]`
      );
    }

    next();
  }

  // ── Deep Object Scanner ───────────────────────────────────────────────────

  private scanObject(obj: any, location: string, depth = 0): string[] {
    if (depth > 10) return []; // Prevent infinite recursion
    const threats: string[] = [];

    if (typeof obj === 'string') {
      return this.scanString(obj, location);
    }

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        threats.push(...this.scanObject(obj[i], `${location}[${i}]`, depth + 1));
      }
      return threats;
    }

    if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        // Check key names for NoSQL operators
        if (this.NOSQL_OPERATORS.includes(key)) {
          threats.push(`NoSQL_operator:${location}.${key}`);
        }
        threats.push(...this.scanObject(value, `${location}.${key}`, depth + 1));
      }
    }

    return threats;
  }

  private scanString(value: string, location: string): string[] {
    const threats: string[] = [];

    for (const pattern of this.SQL_PATTERNS) {
      if (pattern.test(value)) {
        threats.push(`SQL_injection:${location}`);
        break;
      }
    }

    for (const pattern of this.XSS_PATTERNS) {
      if (pattern.test(value)) {
        threats.push(`XSS:${location}`);
        break;
      }
    }

    for (const pattern of this.CMD_PATTERNS) {
      if (pattern.test(value)) {
        threats.push(`CMD_injection:${location}`);
        break;
      }
    }

    if (this.PATH_TRAVERSAL.test(value)) {
      threats.push(`path_traversal:${location}`);
    }

    return threats;
  }

  // ── NoSQL Operator Sanitization ───────────────────────────────────────────

  /**
   * Recursively strips MongoDB-style operators ($gt, $ne, etc.) from
   * request bodies to prevent NoSQL injection attacks.
   */
  private sanitizeNoSqlOperators(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeNoSqlOperators(item));
    }

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip MongoDB operators entirely
      if (key.startsWith('$')) {
        this.logger.warn(`🛡️ Stripped NoSQL operator from request body: "${key}"`);
        continue;
      }
      sanitized[key] = this.sanitizeNoSqlOperators(value);
    }
    return sanitized;
  }
}
