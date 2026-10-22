const paths = {
  arrow: <><path d="M4 12h15M13 6l6 6-6 6" /></>,
  up: <><path d="M12 16V4M6 10l6-6 6 6M4 16v4h16v-4" /></>,
  file: <><path d="M14 3H5v18h14V8zM14 3v6h5M8 13h8M8 17h5" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  back: <path d="m14 5-7 7 7 7" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  book: <><path d="M12 5v15M12 5C9 3 5 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Z" /></>,
  cards: <><path d="M6 7h14v14H6zM3 16V3h13M10 12h6M10 16h4" /></>,
  quiz: <><path d="M5 3h14v18H5zM9 8h6M9 12h6M9 16h3" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01" /></>,
  print: <><path d="M7 8V3h10v5M7 16H3V8h18v8h-4M7 13h10v8H7zM17 11h.01" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  leaf: <><path d="M19 4C8 2 3 8 5 14c2 6 14 5 14-10ZM5 21 15 9" /></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" /></>,
  refresh: <><path d="M20 5v5h-5M4 19v-5h5M5 9a8 8 0 0 1 13-4l2 5M4 14l2 5a8 8 0 0 0 13-4" /></>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3" /></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
  plus: <path d="M5 12h14M12 5v14" />
};

export default function Icon({ name, className = '' }) {
  return <svg className={`od-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name] || paths.file}</svg>;
}
