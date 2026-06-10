import type { Database, QueryRow } from '../../../src/core/infrastructure/storage/DatabaseStorage';

type Row = Record<string, string | number | null>;

/**
 * In-memory Database implementation for integration tests.
 * Handles the limited SQL subset used by all Storage classes:
 * SELECT/INSERT/INSERT OR REPLACE/DELETE/UPDATE with simple WHERE conditions.
 */
export class InMemoryDatabase implements Database {
  private readonly tables = new Map<string, Row[]>();

  clear(): void {
    this.tables.clear();
  }

  seed(table: string, rows: Row[]): void {
    this.tables.set(table, [...rows]);
  }

  dump(table: string): Row[] {
    return [...(this.tables.get(table) ?? [])];
  }

  private rows(table: string): Row[] {
    if (!this.tables.has(table)) this.tables.set(table, []);
    return this.tables.get(table)!;
  }

  async execute<T extends QueryRow>(
    sql: string,
    params: (string | number | null)[] = [],
  ): Promise<T[]> {
    const s = sql.trim();
    const u = s.toUpperCase();
    if (u.startsWith('CREATE') || u.startsWith('ALTER')) return [];
    if (u.startsWith('SELECT')) return this.doSelect<T>(s, params);
    if (u.startsWith('INSERT')) { this.doInsert(s, params); return []; }
    if (u.startsWith('DELETE')) { this.doDelete(s, params); return []; }
    if (u.startsWith('UPDATE')) { this.doUpdate(s, params); return []; }
    return [];
  }

  private extractTable(sql: string): string {
    const m = sql.match(/(?:(?:INSERT\s+(?:OR\s+REPLACE\s+)?INTO)|FROM|UPDATE)\s+(\w+)/i);
    if (!m) throw new Error(`Cannot extract table from: ${sql}`);
    return m[1].toLowerCase();
  }

  private parseWhere(
    clause: string,
    params: (string | number | null)[],
    offset: number,
  ): {
    conds: Array<{ col: string; val?: string | number | null; vals?: (string | number | null)[] }>;
    consumed: number;
  } {
    const conds: Array<{ col: string; val?: string | number | null; vals?: (string | number | null)[] }> = [];
    let consumed = 0;
    for (const part of clause.split(/\s+AND\s+/i)) {
      const trimmed = part.trim();

      // Matches: col IN (?, ?, ...)
      const inMatch = trimmed.match(/^(\w+)\s+IN\s*\(([^)]+)\)$/i);
      if (inMatch) {
        const placeholders = inMatch[2].split(',').map(p => p.trim());
        const vals: (string | number | null)[] = placeholders.map(p => {
          if (p === '?') return params[offset + consumed++] ?? null;
          if (p.startsWith("'")) return p.slice(1, -1);
          return Number(p);
        });
        conds.push({ col: inMatch[1].toLowerCase(), vals });
        continue;
      }

      // Matches: col = ? OR col = 0/1 OR col = 'stringliteral'
      const m = trimmed.match(/^(\w+)\s*=\s*(\?|'([^']*)'|(-?\d+))$/i);
      if (!m) continue;
      const token = m[2].trim();
      let val: string | number | null;
      if (token === '?') {
        val = params[offset + consumed++] ?? null;
      } else if (token.startsWith("'")) {
        val = m[3]; // unquoted string literal
      } else {
        val = Number(token);
      }
      conds.push({ col: m[1].toLowerCase(), val });
    }
    return { conds, consumed };
  }

  private matches(
    row: Row,
    conds: Array<{ col: string; val?: string | number | null; vals?: (string | number | null)[] }>,
  ): boolean {
    return conds.every(c => {
      if (c.vals !== undefined) return c.vals.includes(row[c.col]);
      return row[c.col] === c.val;
    });
  }

  private doSelect<T extends QueryRow>(sql: string, params: (string | number | null)[]): T[] {
    const table = this.extractTable(sql);
    let rows = [...this.rows(table)];

    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|\s*$)/is);
    if (whereMatch) {
      const { conds } = this.parseWhere(whereMatch[1], params, 0);
      rows = rows.filter(r => this.matches(r, conds));
    }

    const orderMatch = sql.match(/ORDER\s+BY\s+(\w+)\s+(ASC|DESC)/i);
    if (orderMatch) {
      const col = orderMatch[1].toLowerCase();
      const asc = orderMatch[2].toUpperCase() === 'ASC';
      rows.sort((a, b) => {
        const av = a[col];
        const bv = b[col];
        if (typeof av === 'number' && typeof bv === 'number') return asc ? av - bv : bv - av;
        return asc
          ? String(av ?? '').localeCompare(String(bv ?? ''))
          : String(bv ?? '').localeCompare(String(av ?? ''));
      });
    }

    return rows as unknown as T[];
  }

  private doInsert(sql: string, params: (string | number | null)[]): void {
    const table = this.extractTable(sql);
    const colMatch = sql.match(/\(([^)]+)\)\s+VALUES/i);
    if (!colMatch) return;

    const cols = colMatch[1].split(',').map(c => c.trim().toLowerCase());
    const row: Row = {};
    cols.forEach((col, i) => { row[col] = params[i] ?? null; });

    const list = this.rows(table);
    if (/INSERT\s+OR\s+REPLACE/i.test(sql) && row.id !== undefined) {
      const idx = list.findIndex(r => r.id === row.id);
      if (idx >= 0) { list[idx] = row; return; }
    }
    list.push(row);
  }

  private doDelete(sql: string, params: (string | number | null)[]): void {
    const table = this.extractTable(sql);
    const whereMatch = sql.match(/WHERE\s+(.+)$/is);
    if (!whereMatch) { this.tables.set(table, []); return; }
    const { conds } = this.parseWhere(whereMatch[1], params, 0);
    this.tables.set(table, this.rows(table).filter(r => !this.matches(r, conds)));
  }

  private doUpdate(sql: string, params: (string | number | null)[]): void {
    const table = this.extractTable(sql);
    const setWhereMatch = sql.match(/SET\s+(.+?)\s+WHERE\s+(.+)$/is);
    if (!setWhereMatch) return;

    let pi = 0;
    const sets: Array<{ col: string; val: string | number | null }> = [];
    for (const part of setWhereMatch[1].split(',')) {
      const m = part.trim().match(/^(\w+)\s*=\s*(\?|(-?\d+))$/i);
      if (!m) continue;
      const token = m[2].trim();
      const val = token === '?' ? (params[pi++] ?? null) : Number(token);
      sets.push({ col: m[1].toLowerCase(), val });
    }

    const { conds } = this.parseWhere(setWhereMatch[2], params, pi);
    for (const row of this.rows(table)) {
      if (this.matches(row, conds)) {
        sets.forEach(s => { row[s.col] = s.val; });
      }
    }
  }
}
