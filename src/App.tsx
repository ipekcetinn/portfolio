import { useEffect } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Scrapbook } from './components/Scrapbook';
import { Footer } from './components/Footer';
import { initializeScrollAnimations } from './lib/scrollAnimations';

export default function App() {
  useEffect(() => initializeScrollAnimations(), []);

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <main id="main">
        <Hero />
        <Scrapbook />
      </main>
      <Footer />    </>
  );
}
