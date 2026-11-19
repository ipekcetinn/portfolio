export function Projects() {
  return (
<section className="scrap-spread projects-spread" id="projeler" aria-labelledby="projects-title">
          <div className="projects-heading" data-reveal><p className="archive-label">06 / WORK IN PROGRESS</p><h2 id="projects-title">Projects<span className="editorial-dot">.</span></h2></div>
          <figure className="media-collage media-projects" data-reveal aria-hidden="true">
            <img className="collage-image" src="assets/collage/projects-cassette.webp" width="1024" height="1024" alt="" loading="lazy" decoding="async" />
          </figure>
          <div className="project-manuscript" data-reveal>
            <div className="manuscript-meta"><span>PROJECT INDEX</span><span>00 ENTRIES</span></div>
            <p className="project-empty-title">A space for future work.</p>
            <p className="archive-copy">Projects, source code, and development notes will be added here as they are ready to share.</p>
            <a className="archive-link" href="https://github.com/ipekcetinn" target="_blank" rel="noopener noreferrer" aria-label="Visit GitHub profile (opens in a new tab)">GitHub <span aria-hidden="true">↗</span></a>
          </div>
          <svg className="print-star star-projects" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 0l9 35 26-20-20 26 35 9-35 9 20 26-26-20-9 35-9-35-26 20 20-26L0 50l35-9-20-26 26 20z"/></svg>
        </section>
  );
}
