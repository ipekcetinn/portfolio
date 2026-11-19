import { EducationRays } from './EducationRays';

export function Education() {
  return (
<section className="scrap-spread education-spread" id="egitim" aria-labelledby="education-title">
            <EducationRays />
            <div className="education-heading" data-reveal><p className="archive-label">03 / ACADEMIC RECORD</p><h2 id="education-title">Edu<span className="heading-break">cation.</span></h2></div>
            <div className="education-record" data-reveal>
              <article className="academic-entry">
                <span className="record-index">2023 — 2027 / EXPECTED</span>
                <h3>Atılım University</h3>
                <p className="degree-name">B.Sc. in Computer Engineering</p>

              </article>

            </div>
            <figure className="media-collage media-education" data-reveal>
              <img className="collage-image" src="assets/collage/education-campus-chip.webp" width="1024" height="1024" alt="Illustrative vintage academic collage with architecture, a microchip and engineering drawings" loading="lazy" decoding="async" />
              <figcaption>ACADEMIC STUDY / ILLUSTRATIVE COLLAGE</figcaption>
            </figure>
          </section>
  );
}
