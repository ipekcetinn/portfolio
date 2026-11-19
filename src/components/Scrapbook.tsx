import { About } from './About';
import { Experience } from './Experience';
import { Education } from './Education';
import { Training } from './Training';
import { Skills } from './Skills';
import { Projects } from './Projects';
import { Contact } from './Contact';

export function Scrapbook() {
  return (
<div className="about-surface scrapbook" id="about">
      <div className="scrapbook-body wrap">
        <About />

        <Experience />

        <div className="learning-flow">
          <Education />
          <Training />
        </div>

        <Skills />

        <Projects />

        <Contact />
      </div>
    </div>
  );
}
