const paths: Record<string, string> = {
  boundary:
    '<rect x="4" y="4" width="16" height="16" rx="4" stroke-dasharray="3 3"/><path d="M1 12h8m-3-3 3 3-3 3m9-3h8m-3-3 3 3-3 3"/>',
  drop: '<path d="M12 2C9 7 5 10 5 15a7 7 0 0 0 14 0c0-5-4-8-7-13Z"/><path d="M8 15a4 4 0 0 0 4 4"/>',
  thermo:
    '<path d="M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Z"/><path d="M12 8v10m6-12h3m-3 4h2"/>',
  mix: '<path d="M4 3v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3M2 3h6m8 0h6M4 12c5-4 11 4 16 0M10 3v5m4-5v5"/>',
  piston: '<path d="M4 8h16v13H4zM3 8h18M12 8V2M8 2h8M7 15h10"/>',
  energy: '<path d="m13 2-9 12h7l-1 8 10-13h-8l1-7Z"/>',
  engine:
    '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4M4 4l3 3m10 10 3 3M4 20l3-3M17 7l3-3"/>',
  flame:
    '<path d="M13 2c2 5-2 7-2 10 3-1 5-2 6-5 3 4 5 7 2 12-3 4-11 4-14-1C2 12 8 8 13 2Z"/>',
  spark: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',
  book: '<path d="M12 5v16M3 3c5-1 7 1 9 2 2-1 4-3 9-2v16c-5-1-7 1-9 2-2-1-4-3-9-2Z"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  play: '<path d="m8 4 12 8-12 8Z"/>',
  pause: '<path d="M8 4v16m8-16v16"/>',
  reset: '<path d="M3 10a9 9 0 1 1 1 8M3 3v7h7"/>',
  pin: '<path d="m9 3 6 0-1 6 4 4v2H6v-2l4-4-1-6Zm3 12v7"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  chart: '<path d="M3 3v18h18M6 16l5-7 5 3 5-9"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 1 1 4 3c-1 1-1 2-1 3m0 3v.1"/>',
};
export const icon = (name: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.spark}</svg>`;
