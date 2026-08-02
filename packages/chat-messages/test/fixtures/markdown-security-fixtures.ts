export interface UnsafeLinkFixture {
  name: string;
  markdown: string;
  protocol: string;
}

export const unsafeLinkFixtures: readonly UnsafeLinkFixture[] = [
  {
    name: 'javascript URL',
    markdown: '[run script](javascript:alert(1))',
    protocol: 'javascript',
  },
  {
    name: 'VBScript URL',
    markdown: '[run VBScript](vbscript:msgbox(1))',
    protocol: 'vbscript',
  },
  {
    name: 'HTML data URL',
    markdown: '[open data](data:text/html,<script>alert(1)</script>)',
    protocol: 'data',
  },
];

export const safeLinkFixtures = [
  '[documentation](https://example.test/docs)',
  '[email](mailto:hello@example.test)',
  '[section](#streaming)',
  '[relative page](./getting-started)',
] as const;

export const rawHtmlFixtures = [
  '<img src=x onerror="alert(1)">',
  '<script>alert(1)</script>',
  '<svg onload="alert(1)"></svg>',
] as const;

export const rendererInjectionFixture = {
  language: 'security-fixture-renderer',
  markdown: '```security-fixture-renderer\nuntrusted renderer payload\n```',
  html: '<img src="x" onerror="alert(1)"><a href="javascript:alert(1)">unsafe</a>',
} as const;
