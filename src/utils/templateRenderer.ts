import {
  TEMPLATE_VARIABLES,
  type MessageTemplate,
  type MessageTemplateSnapshot,
  type TemplateVariable,
  type TemplateVariables,
} from '../models/communication';

export class TemplateRenderError extends Error {
  constructor(
    public readonly code: 'UNKNOWN_VARIABLE' | 'MISSING_REQUIRED_VARIABLE',
    message: string,
  ) {
    super(message);
    this.name = 'TemplateRenderError';
  }
}

const variablePattern = /{{\s*([a-zA-Z][a-zA-Z0-9]*)\s*}}/g;
const tokenPattern = /{{([\s\S]*?)}}/g;
const registered = new Set<string>(TEMPLATE_VARIABLES);

export function extractTemplateVariables(content: string): TemplateVariable[] {
  const found = new Set<TemplateVariable>();
  for (const match of content.matchAll(tokenPattern)) {
    const name = match[1].trim();
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(name))
      throw new TemplateRenderError(
        'UNKNOWN_VARIABLE',
        `Template token {{${name}}} is not a supported variable.`,
      );
    if (!registered.has(name))
      throw new TemplateRenderError(
        'UNKNOWN_VARIABLE',
        `Template variable {{${name}}} is not registered.`,
      );
    found.add(name as TemplateVariable);
  }
  return [...found];
}

export function renderTemplate(
  template: Pick<
    MessageTemplate,
    'content' | 'allowedVariables' | 'requiredVariables'
  >,
  variables: TemplateVariables,
): string {
  const used = extractTemplateVariables(template.content);
  const allowed = new Set(template.allowedVariables);
  const unauthorized = used.find(variable => !allowed.has(variable));
  if (unauthorized)
    throw new TemplateRenderError(
      'UNKNOWN_VARIABLE',
      `Template variable {{${unauthorized}}} is not allowed for this template.`,
    );
  const missing = template.requiredVariables.find(
    variable => !variables[variable]?.trim(),
  );
  if (missing)
    throw new TemplateRenderError(
      'MISSING_REQUIRED_VARIABLE',
      `Required template variable {{${missing}}} is missing.`,
    );
  return template.content.replace(variablePattern, (_, name: string) => {
    if (!registered.has(name))
      throw new TemplateRenderError(
        'UNKNOWN_VARIABLE',
        `Template variable {{${name}}} is not registered.`,
      );
    return variables[name as TemplateVariable]?.trim() ?? '';
  });
}

export function formatTemplateCurrency(amountPaise: number): string {
  return new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: amountPaise % 100 ? 2 : 0,
    minimumFractionDigits: amountPaise % 100 ? 2 : 0,
    style: 'currency',
  }).format(amountPaise / 100);
}

export function formatTemplateDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function snapshotTemplate(
  template: MessageTemplate,
  variables: TemplateVariables,
): MessageTemplateSnapshot {
  const used = Object.fromEntries(
    extractTemplateVariables(template.content).map(key => [
      key,
      variables[key],
    ]),
  ) as TemplateVariables;
  return {
    channel: template.channel,
    code: template.code,
    content: template.content,
    language: template.language,
    name: template.name,
    variablesUsed: used,
  };
}
