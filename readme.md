# Angular HTML Formatting Guide

## Basic Elements

### Empty Elements
Elements with no content and either no attributes or a single attribute should be on one line:
```html
<custom-element></custom-element>
<button class="primary"></button>
```

### Single-Line Elements
Elements with content but no attributes, or with a single attribute, should be on one line:
```html
<span>Short text</span>
<br>
```

### Elements with Single Attribute
Always keep element and its single attribute on the same line:
```html
<div class="container"></div>
<button (click)="onClick()"></button>
<input type="text">
```

## Multi-Attribute Elements

### With Content
When an element has multiple attributes AND content:
- Opening tag on its own line
- Attributes indented with 4 spaces/2 indents
- Each attribute on its own line
- Content indented with 2 spaces/1 indent
- Closing tag aligned with opening tag
```html
<div
    class="container"
    [attr]="value"
    (click)="onClick()">
  Some content here
</div>
```

### Without Content
When an element has multiple attributes but NO content:
- Opening tag on its own line
- Attributes indented with 2 spaces/1 indent
- Each attribute on its own line
- Closing tag on new line, aligned with opening tag
```html
<app-header
  class="main-header"
  [title]="pageTitle"
  (menuClick)="onMenuClick()">
</app-header>
```

## Comments
Comments should be preserved exactly as written in source:
```html
<!-- This comment stays exactly as is -->

<!--
  Multi-line comments
  preserve their
  formatting
-->
```

## Angular Control Flow Syntax
Control flow blocks should be properly indented:
```html
@if (condition) {
  <div>Content</div>
} @else if (otherCondition) {
  <div>Other content</div>
} @else {
  <div>Default content</div>
}

@for (item of items) {
  <div>{{ item }}</div>
}
```

## Interpolation
Interpolation should have consistent spacing:
```html
<div>{{ value }}</div>
<span>Prefix {{ value }} suffix</span>
```

## Nested Elements
Each nesting level adds 2 spaces of indentation(double indents):
```html
<div class="parent">
  <div
      class="child"
      [attr]="value">
    <span>Content</span>
  </div>
</div>
```

## Self-Closing Tags
Self-closing tags should remain self-closing and on one line:
```html
<input type="text">
<input
  type="text"
  name="email">
<br>
```
