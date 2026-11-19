import { SkillsParticles } from './SkillsParticles';

export function Skills() {
  return (
<section className="scrap-spread skills-spread" id="skills" aria-labelledby="skills-title">
          <div data-reveal><p className="archive-label">05 / TECHNICAL VOCABULARY</p><h2 id="skills-title">Technical<br /><em>Skills.</em></h2></div>
          <SkillsParticles />
          <figure className="media-collage media-skills" data-reveal aria-hidden="true">
            <img className="collage-image" src="assets/collage/skills-electronics.webp" width="1024" height="1024" alt="" loading="lazy" decoding="async" />
          </figure>
          <dl className="skills-composition">
            <div className="skill-line programming-line" data-reveal><dt>01 / PROGRAMMING</dt><dd>JavaScript <small>(ES5)</small><span className="skill-separator">/</span>C<span className="skill-separator">/</span>C++<span className="skill-separator">/</span>Python</dd></div>
            <div className="skill-line frontend-line" data-reveal><dt>02 / FRONTEND</dt><dd>jQuery · Kendo UI <small>(MVVM)</small><br />Bootstrap 3 · HTML · CSS</dd></div>
            <div className="skill-line data-line" data-reveal><dt>03 / BACKEND &amp; DATA</dt><dd>Classic ASP · VBScript<br />SQL Server</dd><dd className="skill-annotation">Stored procedures / Table analysis</dd></div>
            <div className="skill-line tools-line" data-reveal><dt>04 / TOOLS</dt><dd>Git · GitLab · Jira</dd></div>
            <div className="skill-line foundations-line" data-reveal><dt>05 / COMPUTER SCIENCE</dt><dd>Object-oriented programming<br />Data structures · Algorithms</dd></div>
          </dl>
        </section>
  );
}
