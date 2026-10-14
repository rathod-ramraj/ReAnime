import React from 'react';
import { useApp } from './context/AppContext';
import { FloatingSidebar } from './components/layout/FloatingSidebar';
import { Header } from './components/layout/Header';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { MobileSearchSheet } from './components/layout/MobileSearchSheet';
import { NotificationPanel } from './components/layout/NotificationPanel';
import { InstallPrompt } from './components/layout/InstallPrompt';
import { Footer } from './components/layout/Footer';
import { ToastContainer } from './components/common/ToastContainer';

// Home Views
import { HeroSpotlight } from './components/home/HeroSpotlight';
import { MobileBrowseBar } from './components/home/MobileBrowseBar';
import { ContinueWatching } from './components/home/ContinueWatching';
import { TrendingCarousel } from './components/home/TrendingCarousel';
import { HomeSection } from './components/home/HomeSection';

// Other Views
import { BrowseView } from './components/browse/BrowseView';
import { SearchResultsView } from './components/search/SearchResultsView';
import { LibraryView } from './components/library/LibraryView';
import { SeriesView } from './components/watch/SeriesView';

export function App() {
  const { view, homeCategory, searchMode, airingItems, popularItems, completedItems, homeLoading } = useApp();

  React.useEffect(() => {
    const timer = setTimeout(() => {
      const targets = document.querySelectorAll('.reveal-up:not(.is-visible)');
      if (!targets.length) return;

      if (!('IntersectionObserver' in window)) {
        targets.forEach((el) => el.classList.add('is-visible'));
        return;
      }

      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
      );

      targets.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          el.classList.add('is-visible');
        } else {
          io.observe(el);
        }
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [view, homeCategory, searchMode, homeLoading, airingItems.length, popularItems.length, completedItems.length]);

  return (
    <>
      <FloatingSidebar />
      <Header />

      <main className={`page${view === 'home' && !searchMode ? ' home-mode' : ' series-mode'}`} id="pageRoot">
        <div className="content">
          {view === 'series' ? (
            <SeriesView />
          ) : searchMode ? (
            <SearchResultsView />
          ) : homeCategory === 'library' ? (
            <LibraryView />
          ) : homeCategory !== 'home' ? (
            <BrowseView />
          ) : (
            <section id="homeView" className="view" aria-label="Home">
              <HeroSpotlight />
              <MobileBrowseBar />
              <ContinueWatching />
              <TrendingCarousel />
              <HomeSection
                id="homeAiringSection"
                title="Top Airing"
                items={airingItems}
                loading={homeLoading}
              />
              <HomeSection
                id="homePopularSection"
                title="Most Popular"
                items={popularItems}
                loading={homeLoading}
              />
              <HomeSection
                id="homeCompletedSection"
                title="Latest Completed"
                items={completedItems}
                loading={homeLoading}
              />
            </section>
          )}
        </div>
      </main>

      <MobileSearchSheet />
      <MobileBottomNav />
      <NotificationPanel />
      <InstallPrompt />
      <ToastContainer />
      <Footer />
    </>
  );
}
