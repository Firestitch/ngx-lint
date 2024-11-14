/**
 * Angular Prettier Plugin
 *
 * Key formatting rules:
 * 1. Elements with single attribute stay on one line
 *    <button class="primary"></button>
 *
 * 2. Elements with multiple attributes but no content:
 *    - Single indent (2 spaces) for attributes
 *    - Closing tag on new line
 *    <app-element
 *      [prop]="value"
 *      class="class">
 *    </app-element>
 *
 * 3. Elements with multiple attributes and content:
 *    - Double indent (4 spaces) for attributes
 *    - Content indented
 *    <div
 *        class="class"
 *        [prop]="value">
 *      Content
 *    </div>
 *
 * 4. Comments are preserved exactly as in source
 * 5. Control flow syntax (@if, @for) is properly indented
 */

const { parsers: htmlParsers } = require("prettier/parser-html");

// Self-closing tags don't need end tags and are always formatted on one line
function isSelfClosingTag(name) {
  return ["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"].includes(name);
}

// Detects Angular's new control flow syntax introduced in v17
function isControlFlowDirective(text) {
  return /^@(if|for|switch|defer|else if|else|case|default|error)\b/m.test(text.replace(/\s+/g, ' ').trim());
}

// Identifies chained control flow statements that should be on the same line as closing brace
// Example: } @else if (condition) {
function isIfChainDirective(text) {
  return /^@(else if|else|placeholder|loading|error)\b/m.test(text.replace(/\s+/g, ' ').trim());
}

// Detects Angular interpolation syntax
// Example: {{ value }}
function isInterpolation(text) {
  const result = /^\s*{{\s*.*?\s*}}\s*$/.test(text);
  return result;
}

/**
 * Formats element attributes according to these rules:
 * 1. Single attribute: stays inline with tag
 *    <div class="container">
 *
 * 2. Multiple attributes without content: single indent (2 spaces)
 *    <app-element
 *      [prop]="value"
 *      class="class">
 *
 * 3. Multiple attributes with content: double indent (4 spaces)
 *    <div
 *        class="class"
 *        [prop]="value">
 */
function formatAttributes(attrs, indent, isSingleLine = false) {
  // Single attribute handling - stays on same line
  if (attrs.length === 1) {
    const attr = attrs[0];
    if (attr.value === null) {
      return attr.name;
    }
    return `${attr.name}="${attr.value}"`;
  }

  // Multiple attributes - each on new line with proper indentation
  return attrs
    .map(attr => {
      if (attr.value === null) {
        return `${indent}${attr.name}`;
      }
      const formattedAttr = `${attr.name}="${attr.value}"`;
      return `${indent}${formattedAttr}`;
    })
    .join('\n');
}

/**
 * Formats Angular control flow syntax (@if, @for, etc)
 * Example inputs:
 * - @if (condition) {
 * - @for (item of items) {
 * - @switch (value) {
 */
function formatControlFlow(node, indent) {
  const content = node.value.trim();

  const normalizedContent = content.replace(/\s+/g, ' ');
  const directiveMatch = normalizedContent.match(/^(@\w+.*?){/);

  if (!directiveMatch) {
    return `${indent}${content}`;
  }

  const [fullMatch] = directiveMatch;
  const directive = fullMatch.slice(0, -1).trim();

  // Handle condition part of control flow
  const parts = directive.match(/^(@\w+(?:\s+if)?)\s*(.*)/);
  if (parts) {
    const [, directiveName, condition] = parts;
    if (condition) {
      return `${indent}${directiveName} ${condition.trim()} {`;
    }
  }

  return `${indent}${directive} {`;
}

/**
 * Formats Angular interpolation with consistent spacing
 * Input: {{value}} or {{ value }}
 * Output: {{ value }}
 */
function formatInterpolation(text, indent) {
  // Split the pattern into explicit parts to ensure spaces
  const regex = /{{\s*(.*?)\s*}}/g;

  const result = text.replace(regex, (_fullMatch, content, offset, str) => {
    // Explicitly build with spaces and indent
    const trimmedContent = content.trim();
    const formatted = '{{ ' + trimmedContent + ' }}'; // Note the explicit space after {{ and before }}

    // If this isn't the first interpolation and there was no space between them,
    // don't add extra space
    if (offset > 0 && str[offset - 1] === '}') {
      return formatted;
    }

    return formatted;
  });

  return indent + result;
}

/**
 * Splits text content to handle different types:
 * - Regular text
 * - Interpolation {{ }}
 * - Control flow @if, @for
 *
 * This allows each type to be formatted according to its own rules
 */
function splitTextNode(node) {
  if (!node.value) return [node];

  const content = node.value;
  if (!content) return [];

  // Preserve interpolations while splitting content
  let interpolations = [];
  // Regex with greedy dot-all to capture everything between {{ and }}
  let protectedContent = content.replace(/{{\s*[\s\S]*?\s*}}/g, (match) => {
    // Format the interpolation: normalize all whitespace
    const formattedMatch = match
      .replace(/{{[\s\S]*?}}/g, (interpolation) => {
        // Extract content between {{ and }}
        const innerContent = interpolation
          .slice(2, -2)  // Remove {{ and }}
          .replace(/[\s\n\r]+/g, ' ')  // Replace all whitespace and newlines with single space
          .trim();  // Remove leading/trailing spaces

        return `{{ ${innerContent} }}`;  // Rebuild with consistent spacing
      });

    interpolations.push(formattedMatch);
    return `__INTERPOLATION${interpolations.length - 1}__`;
  });

  const parts = protectedContent
    .split(/(\}|\@(?:if|for|switch|defer|else if|else|case|default|error).*?{)/g)
    .filter(Boolean)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const restoredPart = part.replace(/__INTERPOLATION(\d+)__/g, (_, index) => interpolations[index]);
      return {
        type: 'text',
        value: restoredPart
      };
    });

  return parts;
}

/**
 * Determines if an element has meaningful content
 * This affects attribute indentation:
 * - With content: double indent (4 spaces)
 * - Without content: single indent (2 spaces)
 */
function hasContent(children) {
  if (!children || children.length === 0) return false;

  return children.some(child => {
    if (child.type === 'text') {
      return child.value && child.value.trim() !== '';
    }
    return true;
  });
}

/**
 * Main formatting function that implements the formatting rules
 */
function formatElement(node, indent = '') {
  // Preserve comments exactly as they appear in source
  if (node.type === 'comment') {
    return `${indent}<!--${node.value}-->`;
  }

  // Handle text nodes
  if (node.type === 'text' && node.value) {
    const trimmed = node.value.trim();
    if (!trimmed) return '';

    if (isControlFlowDirective(trimmed)) {
      return formatControlFlow(node, indent);
    }
    if (isInterpolation(trimmed)) {
      const result = formatInterpolation(trimmed, indent);
      return result;
    }
    const result = `${indent}${trimmed}`;
    return result;
  }

  const { name, attrs, children } = node;
  if (!name) return '';

  const hasAttributes = attrs && attrs.length > 0;
  const hasChildren = children && children.length > 0;
  const elementHasContent = hasContent(children);
  const hasSingleAttr = hasAttributes && attrs.length === 1;

  // Elements with single or no attributes AND no content should be on one line
  const shouldBeSingleLine = !elementHasContent && (hasSingleAttr || !hasAttributes);


  let result = `${indent}<${name}`;

  // Handle attributes based on content and quantity
  if (hasAttributes) {
    if (hasSingleAttr) {
      // Single attribute stays on same line
      result += ` ${formatAttributes(attrs)}`;
    } else {
      // Multiple attributes: indent based on content
      // - With content: double indent (4 spaces)
      // - Without content: single indent (2 spaces)
      const attrIndent = elementHasContent ? '    ' : '  ';
      result += '\n' + formatAttributes(attrs, indent + attrIndent);
    }
    result += '>';
  } else {
    result += '>';
  }

  // Single line elements (single attribute, no content)
  if (shouldBeSingleLine) {
    if (!isSelfClosingTag(name)) {
      result += `</${name}>`;
    }
    return result;
  }

  // Self-closing tags
  if (!hasChildren && isSelfClosingTag(name)) {
    return result;
  }

  // Elements with multiple attributes but no content
  // Closing tag goes on new line
  if (!elementHasContent) {
    result += `\n${indent}</${name}>`;
    return result;
  }

  // Handle nested content with proper indentation
  if (hasChildren) {
    let nestedBlockStack = [];
    let childResults = [];
    const childBaseIndent = indent + '  ';

    for (let i = 0; i < children.length; i++) {
      const child = children[i];

      if (child.type === 'text' && child.value) {
        const parts = splitTextNode(child);

        for (let j = 0; j < parts.length; j++) {
          const part = parts[j];
          const value = part.value;
          const nextPart = parts[j + 1];

          // Handle control flow blocks with proper nesting
          if (isControlFlowDirective(value)) {
            // Use same strategy as formatRoot
            const currentIndent = nestedBlockStack.length > 0
              ? nestedBlockStack[nestedBlockStack.length - 1].contentIndent
              : childBaseIndent;

            const block = {
              directive: value,
              indent: currentIndent,
              contentIndent: currentIndent + '  '
            };

            childResults.push(formatControlFlow(part, currentIndent));
            nestedBlockStack.push(block);
          } else if (value === '}' && nestedBlockStack.length > 0) {
            const block = nestedBlockStack.pop();
            // Handle chained control flow (@else if, @else)
            if (nextPart && isIfChainDirective(nextPart.value)) {
              const chainedDirective = formatControlFlow(nextPart, '').trim();
              childResults.push(`${block.indent}} ${chainedDirective}`);
              j++;

              // Use same indentation strategy for all chain blocks
              nestedBlockStack.push({
                directive: nextPart.value,
                indent: block.indent,
                contentIndent: block.indent + '  '
              });
            } else {
              childResults.push(`${block.indent}}`);
            }
          } else {
            // Regular content gets indented based on nesting level
            const currentIndent = nestedBlockStack.length > 0
              ? nestedBlockStack[nestedBlockStack.length - 1].contentIndent
              : childBaseIndent;

            const formatted = formatElement({ type: 'text', value }, currentIndent);
            if (formatted.trim()) {
              childResults.push(formatted);
            }
          }
        }
      } else {
        const currentIndent = nestedBlockStack.length > 0
          ? nestedBlockStack[nestedBlockStack.length - 1].contentIndent
          : childBaseIndent;

        const formatted = formatElement(child, currentIndent);
        if (formatted.trim()) {
          childResults.push(formatted);
        }
      }
    }

    result += '\n' + childResults.join('\n');
    result += '\n' + indent;
  }

  result += `</${name}>`;

  return result;
}

/**
 * Processes the root level nodes of the template
 * Maintains proper nesting for control flow blocks
 */
function formatRoot(nodes, baseIndent = '') {
  let result = [];
  const blockStack = [];

  function processNode(node, indent) {
    if (node.type === 'text' && (!node.value || node.value.trim() === '')) {
      return;
    }

    const nodesToProcess = node.type === 'text' ? splitTextNode(node) : [node];

    for (let i = 0; i < nodesToProcess.length; i++) {
      const n = nodesToProcess[i];
      const nextNode = nodesToProcess[i + 1];

      if (n.type === 'text') {
        const value = n.value;

        // Handle control flow block closings
        if (value === '}') {
          if (blockStack.length > 0) {
            const block = blockStack.pop();

            // Handle chained statements (@else if, @else)
            if (nextNode && nextNode.type === 'text' && isIfChainDirective(nextNode.value)) {
              const chainedDirective = formatControlFlow(nextNode, '').trim();
              result.push(`${block.indent}} ${chainedDirective}`);
              i++;

              blockStack.push({
                directive: nextNode.value,
                indent: block.indent,
                contentIndent: block.indent + '  '  // Maintain same content indent as parent
              });
            } else {
              result.push(`${block.indent}}`);
            }
          }
        } else if (isControlFlowDirective(value)) {
          // Start new control flow block
          // Use the same strategy as formatElement
          const currentIndent = blockStack.length > 0
            ? blockStack[blockStack.length - 1].contentIndent
            : indent;

          const block = {
            directive: value,
            indent: currentIndent,
            contentIndent: currentIndent + '  '
          };

          result.push(formatControlFlow({ type: 'text', value }, currentIndent));
          blockStack.push(block);
        } else {
          // Regular text content
          const currentIndent = blockStack.length > 0
            ? blockStack[blockStack.length - 1].contentIndent
            : indent;

          const formatted = formatElement(n, currentIndent);
          if (formatted.trim()) {
            result.push(formatted);
          }
        }
      } else {
        // Non-text nodes (elements, comments)
        const currentIndent = blockStack.length > 0
          ? blockStack[blockStack.length - 1].contentIndent
          : indent;

        const formatted = formatElement(n, currentIndent);
        if (formatted.trim()) {
          result.push(formatted);
        }
      }
    }
  }

  for (const node of nodes) {
    processNode(node, baseIndent);
  }

  return result.join('\n');
}

/**
 * Plugin configuration
 * Extends Prettier's HTML parser with custom formatting for Angular templates
 */
const angularPlugin = {
  parsers: {
    angular: {
      ...htmlParsers.html,
      astFormat: "angular-ast",
      parse(text, parsers, options) {
        // First preserve the DOCTYPE
        const doctypeMatch = text.match(/^<!DOCTYPE[^>]*>/i);
        const doctype = doctypeMatch ? doctypeMatch[0] : '';

        // Parse the HTML
        const ast = htmlParsers.html.parse(text, parsers, options);

        // Add the DOCTYPE to the AST root node
        if (doctypeMatch) {
          ast.doctype = doctype;
        }

        return ast;
      }
    },
    html: {
      ...htmlParsers.html,
      astFormat: "angular-ast",
      parse(text, parsers, options) {
        // Same DOCTYPE preservation for HTML parser
        const doctypeMatch = text.match(/^<!DOCTYPE[^>]*>/i);
        const doctype = doctypeMatch ? doctypeMatch[0] : '';

        const ast = htmlParsers.html.parse(text, parsers, options);

        if (doctypeMatch) {
          ast.doctype = doctype;
        }

        return ast;
      }
    }
  },
  printers: {
    "angular-ast": {
      print(path, options, print) {
        const node = path.getValue();
        if (node.type === 'root') {
          const doctype = node.doctype ? `${node.doctype}\n` : '';
          return doctype + formatRoot(node.children);
        }
        return formatElement(node);
      },
    },
  },
};

module.exports = angularPlugin;
