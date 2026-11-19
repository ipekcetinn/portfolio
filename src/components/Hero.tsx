export function Hero() {
  return (
<section className="hero-scroll" id="hero-stage" aria-labelledby="hero-title">
      <div className="hero">
        <div className="hero-background" aria-hidden="true">
          <div className="hero-spiral" id="hero-spiral"></div>
          <div className="hero-ink"></div>
        </div>
        <div className="hero-content">
          <h1 id="hero-title">İpek Çetin</h1>
          <p className="hero-subtitle">COMPUTER ENGINEERING STUDENT</p>
        </div>
        <img className="hero-cat" src="assets/cat-transparent.png" width="1024" height="1536" alt="Yawning cat in a vintage print style" fetchPriority="high" decoding="async" />
        <a className="hero-scroll-cue" href="#hakkimda">SCROLL TO EXPLORE <span aria-hidden="true">↓</span></a>
      </div>
    </section>
  );
}
