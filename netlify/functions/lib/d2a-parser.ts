/**
 * Docs2Agent (D2A) Parser
 *
 * Transforms structured markdown documents into executable agentic workflows.
 * Supports SPEC, SOP, TEMPLATE, and MANIFEST document types.
 *
 * Version: 1.0.0
 * Last Updated: 2025-12-09
 */

import * as yaml from 'js-yaml';

/**
 * D2A Document Types
 */
export type D2ADocumentType = 'spec' | 'sop' | 'template' | 'manifest';

/**
 * Parsed code block from markdown
 */
export interface CodeBlock {
  language: string;
  content: string;
  lineNumber: number;
}

/**
 * Parsed table from markdown
 */
export interface TableData {
  headers: string[];
  rows: string[][];
  lineNumber: number;
}

/**
 * Document section with extracted content
 */
export interface D2ASection {
  heading: string;
  level: number;
  content: string;
  codeBlocks: CodeBlock[];
  tables: TableData[];
  lineNumber: number;
}

/**
 * Complete parsed D2A document
 */
export interface D2ADocument {
  type: D2ADocumentType;
  name: string;
  version: string;
  metadata: Record<string, any>;
  sections: D2ASection[];
  variables: Record<string, any>;
  rawContent: string;
}

/**
 * Parser configuration options
 */
export interface ParserOptions {
  extractCodeBlocks?: boolean;
  extractTables?: boolean;
  extractMetadata?: boolean;
  variablePattern?: RegExp;
}

const DEFAULT_OPTIONS: ParserOptions = {
  extractCodeBlocks: true,
  extractTables: true,
  extractMetadata: true,
  variablePattern: /\$\{([A-Z_][A-Z0-9_]*)\}/g,
};

/**
 * Parse a D2A document from markdown content
 */
export function parseD2ADocument(
  content: string,
  options: ParserOptions = {}
): D2ADocument {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const lines = content.split('\n');
  const metadata = opts.extractMetadata ? extractMetadata(lines) : {};
  const sections = parseSections(lines, opts);
  const variables = extractVariables(content, opts.variablePattern!);

  // Determine document type from filename pattern or metadata
  const type = determineDocumentType(metadata, content);
  const name = metadata.name || 'untitled';
  const version = metadata.version || '1.0.0';

  return {
    type,
    name,
    version,
    metadata,
    sections,
    variables,
    rawContent: content,
  };
}

/**
 * Extract metadata from document frontmatter or header
 */
function extractMetadata(lines: string[]): Record<string, any> {
  const metadata: Record<string, any> = {};

  // Look for YAML frontmatter (--- ... ---)
  if (lines[0]?.trim() === '---') {
    const endIndex = lines.slice(1).findIndex(line => line.trim() === '---');
    if (endIndex !== -1) {
      const yamlContent = lines.slice(1, endIndex + 1).join('\n');
      try {
        const parsed = yaml.load(yamlContent);
        if (typeof parsed === 'object' && parsed !== null) {
          Object.assign(metadata, parsed);
        }
      } catch (error) {
        console.warn('Failed to parse YAML frontmatter:', error);
      }
    }
  }

  // Extract metadata from markdown header (first few lines)
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const line = lines[i];

    // Match **Key:** Value pattern
    const match = line.match(/^\*\*([^:]+):\*\*\s*(.+)$/);
    if (match) {
      const key = match[1].toLowerCase().replace(/\s+/g, '_');
      const value = match[2].trim();
      metadata[key] = value;
    }
  }

  return metadata;
}

/**
 * Parse document into sections
 */
function parseSections(
  lines: string[],
  options: ParserOptions
): D2ASection[] {
  const sections: D2ASection[] = [];
  let currentSection: D2ASection | null = null;
  let currentContent: string[] = [];
  let inCodeBlock = false;
  let currentCodeBlock: { lang: string; lines: string[]; startLine: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch && !inCodeBlock) {
      // Save previous section
      if (currentSection) {
        currentSection.content = currentContent.join('\n').trim();
        sections.push(currentSection);
      }

      // Start new section
      currentSection = {
        heading: headingMatch[2].trim(),
        level: headingMatch[1].length,
        content: '',
        codeBlocks: [],
        tables: [],
        lineNumber: i + 1,
      };
      currentContent = [];
      continue;
    }

    // Detect code block
    const codeBlockMatch = line.match(/^```(\w+)?/);
    if (codeBlockMatch) {
      if (!inCodeBlock) {
        // Start code block
        inCodeBlock = true;
        currentCodeBlock = {
          lang: codeBlockMatch[1] || 'text',
          lines: [],
          startLine: i + 1,
        };
      } else if (currentCodeBlock) {
        // End code block
        inCodeBlock = false;
        if (options.extractCodeBlocks && currentSection) {
          currentSection.codeBlocks.push({
            language: currentCodeBlock.lang,
            content: currentCodeBlock.lines.join('\n'),
            lineNumber: currentCodeBlock.startLine,
          });
        }
        currentCodeBlock = null;
      }
      continue;
    }

    // Collect code block content
    if (inCodeBlock && currentCodeBlock) {
      currentCodeBlock.lines.push(line);
      continue;
    }

    // Collect section content
    if (currentSection) {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    currentSection.content = currentContent.join('\n').trim();

    // Extract tables from content
    if (options.extractTables) {
      currentSection.tables = extractTables(currentSection.content, currentSection.lineNumber);
    }

    sections.push(currentSection);
  }

  return sections;
}

/**
 * Extract tables from markdown content
 */
function extractTables(content: string, startLineNumber: number): TableData[] {
  const tables: TableData[] = [];
  const lines = content.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Detect table (line with | separators)
    if (line.includes('|') && line.trim().startsWith('|')) {
      const headers = line
        .split('|')
        .map(cell => cell.trim())
        .filter(cell => cell.length > 0);

      // Check for separator line (|---|---|)
      if (i + 1 < lines.length && lines[i + 1].includes('---')) {
        const rows: string[][] = [];

        // Collect table rows
        let j = i + 2;
        while (j < lines.length && lines[j].includes('|')) {
          const row = lines[j]
            .split('|')
            .map(cell => cell.trim())
            .filter(cell => cell.length > 0);

          if (row.length > 0) {
            rows.push(row);
          }
          j++;
        }

        if (headers.length > 0 && rows.length > 0) {
          tables.push({
            headers,
            rows,
            lineNumber: startLineNumber + i + 1,
          });
        }

        i = j;
        continue;
      }
    }

    i++;
  }

  return tables;
}

/**
 * Extract variable references from content
 */
function extractVariables(
  content: string,
  pattern: RegExp
): Record<string, any> {
  const variables: Record<string, any> = {};
  const matches = content.matchAll(new RegExp(pattern, 'g'));

  for (const match of matches) {
    const varName = match[1];
    if (!variables[varName]) {
      variables[varName] = null; // Placeholder - actual value set at runtime
    }
  }

  return variables;
}

/**
 * Determine document type from content
 */
function determineDocumentType(
  metadata: Record<string, any>,
  content: string
): D2ADocumentType {
  // Check explicit type in metadata
  if (metadata.type) {
    const type = metadata.type.toLowerCase();
    if (['spec', 'sop', 'template', 'manifest'].includes(type)) {
      return type as D2ADocumentType;
    }
  }

  // Infer from filename patterns
  const contentLower = content.toLowerCase();
  if (contentLower.includes('_spec.md') || contentLower.includes('specification')) {
    return 'spec';
  }
  if (contentLower.includes('_sop.md') || contentLower.includes('standard operating procedure')) {
    return 'sop';
  }
  if (contentLower.includes('_template.md') || contentLower.includes('template')) {
    return 'template';
  }
  if (contentLower.includes('.yml') || contentLower.includes('manifest')) {
    return 'manifest';
  }

  // Default to spec
  return 'spec';
}

/**
 * Find sections by heading pattern
 */
export function findSections(
  document: D2ADocument,
  headingPattern: RegExp | string
): D2ASection[] {
  const pattern = typeof headingPattern === 'string'
    ? new RegExp(headingPattern, 'i')
    : headingPattern;

  return document.sections.filter(section =>
    pattern.test(section.heading)
  );
}

/**
 * Extract agent configuration from spec document
 */
export function extractAgentConfig(
  document: D2ADocument
): Record<string, any> | null {
  // Look for "Agent Configuration" section
  const configSections = findSections(document, /agent\s+configuration/i);

  if (configSections.length === 0) {
    return null;
  }

  // Find JSON code blocks in config sections
  for (const section of configSections) {
    for (const codeBlock of section.codeBlocks) {
      if (['json', 'jsonc'].includes(codeBlock.language.toLowerCase())) {
        try {
          return JSON.parse(codeBlock.content);
        } catch (error) {
          console.warn('Failed to parse agent config JSON:', error);
        }
      }
    }
  }

  return null;
}

/**
 * Extract workflow steps from SOP document
 */
export function extractWorkflowSteps(
  document: D2ADocument
): Array<{ name: string; agent: string; description: string }> {
  const steps: Array<{ name: string; agent: string; description: string }> = [];

  // Look for sections that describe workflow steps
  const stepSections = findSections(document, /step|phase|stage/i);

  for (const section of stepSections) {
    // Extract agent name from content
    const agentMatch = section.content.match(/agent:\s*(\w+)/i);
    const agent = agentMatch ? agentMatch[1] : 'unknown';

    steps.push({
      name: section.heading,
      agent,
      description: section.content,
    });
  }

  return steps;
}

/**
 * Parse YAML manifest content
 */
export function parseManifest(content: string): any {
  try {
    return yaml.load(content);
  } catch (error) {
    throw new Error(`Failed to parse manifest YAML: ${error}`);
  }
}

/**
 * Interpolate variables in content
 */
export function interpolateVariables(
  content: string,
  variables: Record<string, any>,
  pattern: RegExp = /\$\{([A-Z_][A-Z0-9_]*)\}/g
): string {
  return content.replace(pattern, (match, varName) => {
    if (varName in variables) {
      return String(variables[varName]);
    }
    return match; // Leave unresolved variables as-is
  });
}
