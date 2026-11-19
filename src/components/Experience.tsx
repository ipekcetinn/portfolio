import TextType, { type TextTypeProps } from './effects/TextType';

type ExperienceTextProps = Pick<TextTypeProps,
  'text' | 'as' | 'typingSpeed' | 'initialDelay' | 'className' | 'showCursor'>;

function Typed({ showCursor = false, ...props }: ExperienceTextProps) {
  return <TextType typingSpeed={8} typeEffect="fade" mistakes={0}
    loop={false} cursorStyle="bar" cursorGlide startOnVisible
    showCursor={showCursor} {...props} />;
}

export function Experience() {
  return (
    <section className="scrap-spread experience-spread" id="experience"
      aria-labelledby="experience-title" data-text-type-group="">
      <div data-reveal>
        <p className="archive-label"><Typed text="02 / FIELD NOTES" typingSpeed={10} /></p>
        <h2 id="experience-title">
          <Typed className="experience-type-title" text="Experience" typingSpeed={65} initialDelay={220} showCursor />
          <span className="editorial-dot">.</span>
        </h2>
      </div>
      <article className="experience-record" data-reveal>
        <div className="document-header">
          <Typed text="RECORD / 001" initialDelay={850} />
          <time dateTime="2026-07-12"><Typed text="July 12, 2026 — Present" initialDelay={950} typingSpeed={8} /></time>
        </div>
        <Typed as="h3" className="experience-type-block" text="Belsis"
          initialDelay={1150} typingSpeed={25} showCursor />
        <Typed as="p" className="job-title experience-type-block" text="Long-Term Intern"
          initialDelay={1350} />
        <Typed as="p" className="system-label experience-type-block"
          text="NETX / MUNICIPAL ERP SYSTEM" initialDelay={1500} typingSpeed={8} />
        <ul className="experience-notes">
          <Typed as="li" className="experience-type-block" initialDelay={1800} typingSpeed={5} showCursor
            text="Modernized the Classic ASP/VBScript interface of NETX, a municipal ERP system used by more than 40 municipalities, into a frontend built with JavaScript (ES5), Kendo UI (MVVM), and Bootstrap 3." />
          <Typed as="li" className="experience-type-block" initialDelay={2850} typingSpeed={5} showCursor
            text="Analyzed SQL Server tables and stored procedures to support the system modernization." />
        </ul>
      </article>
    </section>
  );
}
