import { AboutTicket } from './AboutTicket';


export function About() {
  return (
<section className="scrap-spread about-spread" id="hakkimda" aria-labelledby="about-title">

          <div className="about-copy" data-reveal>
            <p className="archive-label">01 / PERSONAL NOTES</p>
            <h2 id="about-title">About<br /><em>Me.</em></h2>
            <AboutTicket>
            <p className="archive-copy">Fourth-year Computer Engineering student at Atılım University, gaining practical experience through a long-term internship at Belsis.</p>
            <p className="archive-copy">Practical experience in frontend modernization and SQL Server analysis, paired with a steady approach to learning and teamwork.</p>
            <p className="language-note"><span>Turkish / Native</span><span>English / B2</span></p>
            </AboutTicket>
          </div>
          <figure className="collage-space media-about" data-reveal>
            <img className="collage-image" src="assets/collage/about-crt-cat.webp" width="1024" height="1024" alt="Vintage collage of a CRT television showing a black cat, a Polaroid and torn paper" loading="lazy" decoding="async" />
            <figcaption><span>FIG. 01 / RETRO TECHNOLOGY</span></figcaption>
          </figure>
          <svg className="print-star star-about" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 0l9 35 26-20-20 26 35 9-35 9 20 26-26-20-9 35-9-35-26 20 20-26L0 50l35-9-20-26 26 20z"/></svg>
        </section>
  );
}
