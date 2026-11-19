import { TrainingTerminal } from './TrainingTerminal';
import { useEffect, useMemo, useRef, useState } from 'react';
import Folder from './effects/Folder';

const records = [
  {
    id: 'http',
    date: '2026-02',
    dateLabel: 'FEBRUARY 2026',
    title: 'HTTP (Web) Service Management',
    camp: 'Mustafa Akgül Free Software Winter Camp',
    university: 'Afyon Kocatepe University',
  },
  {
    id: 'python',
    date: '2025-08',
    dateLabel: 'AUGUST 2025',
    title: 'Introduction to Programming with Python',
    camp: 'Mustafa Akgül Free Software Summer Camp',
    university: 'Bolu Abant İzzet Baysal University',
  },
  {
    id: 'frontend',
    date: '2025-02',
    dateLabel: 'FEBRUARY 2025',
    title: 'Beginning Front-End Course',
    camp: 'Mustafa Akgül Free Software Winter Camp',
    university: 'Anadolu University',
  },
];

export function Training() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const [size, setSize] = useState(.9);
  const archiveRef = useRef<HTMLDivElement>(null);
  const items = useMemo(() => records.map((record, index) => ({
    title: record.title,
    description: record.dateLabel,
    content: <div className="training-folder-preview">
      <span>0{index + 1} / COURSE NOTES</span>
      <strong>{record.title}</strong>
      <span>{record.dateLabel}</span>
      <small>SELECT TO READ</small>
    </div>,
  })), []);
  useEffect(() => {
    const node = archiveRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      setSize(Math.min(1.45, Math.max(.7, (entry.contentRect.width - 16) / (224 * 1.8))));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <section className="scrap-spread training-spread" id="training" aria-labelledby="training-title">
      <TrainingTerminal />
      <div className="training-heading" data-reveal>
        <p className="archive-label">04 / CONTINUED LEARNING</p>
        <h2 id="training-title">Training<span className="editorial-dot">.</span></h2>
      </div>
      <div className="training-records training-folder-records" data-reveal data-folder-scope="" ref={archiveRef}>
                <div className="training-folder-shell">
          <Folder label="Training / 2025–2026" items={items} size={size}
            mode="flap" variant="matte" color="#c8af89" paperColor="#e4d5b5"
            layout="spread" tabPosition="left" theme="dark" openOn="click"
            open={open} onOpenChange={setOpen} onItemClick={(_, index) => setSelected(index)}
            draggable zoomOnClick peek intro tilt={.25} bounce={.2} speed={1.1} />
        </div>
        <div className="training-folder-details" id="training-archive-details" hidden={!open}>
          {records.map((record, index) => (
            <article className="training-entry" key={record.id}
              id={'training-archive-record-' + record.id}
              hidden={!open || selected !== index}
              role="region" aria-labelledby={'training-note-' + record.id}>
              <time dateTime={record.date}>{record.dateLabel}</time>
              <h3 id={'training-note-' + record.id}>{record.title}</h3>
              <p>{record.camp}<br />{record.university}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
