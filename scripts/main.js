// MOVE Elite 3.2 - Core Functional Engine
document.addEventListener('DOMContentLoaded', () => {
      const state = {
                archetype: null,
                initializing: true,
                currentView: 'home',
                lastBpm: 72
      };

                              const overlay = document.getElementById('induction-overlay');
      const pbar = document.getElementById('induction-pbar');
      const slides = document.querySelectorAll('.induction-slide');
      const skipBtn = document.getElementById('induction-skip');
      const navItems = document.querySelectorAll('.nav-item');
      const pageViews = document.querySelectorAll('.page-view');
      const bpmDisplay = document.getElementById('bpm-display');
      const scanBtn = document.getElementById('scan-trigger');

                              let currentSlide = 1;
      const totalSlides = slides.length;

                              function updateProgress() {
                                        const progress = (currentSlide / totalSlides) * 100;
                                        if (pbar) pbar.style.width = `${progress}%`;
                              }

                              function nextSlide() {
                                        if (currentSlide < totalSlides) {
                                                      slides[currentSlide - 1].classList.remove('active');
                                                      currentSlide++;
                                                      slides[currentSlide - 1].classList.add('active');
                                                      updateProgress();
                                                      if (currentSlide === totalSlides && skipBtn) {
                                                                        skipBtn.textContent = 'ENTER ELITE INTERFACE';
                                                      }
                                        }
                              }

                              document.querySelectorAll('.archetype-card').forEach(card => {
                                        card.addEventListener('click', () => {
                                                      document.querySelectorAll('.archetype-card').forEach(c => c.classList.remove('selected'));
                                                      card.classList.add('selected');
                                                      state.archetype = card.dataset.archetype;
                                                      setTimeout(nextSlide, 600);
                                        });
                              });
      // Final Scripting Integration
                              if (skipBtn) {
                                        skipBtn.addEventListener('click', () => {
                                                      if (currentSlide < totalSlides) {
                                                                        while (currentSlide < totalSlides) nextSlide();
                                                      } else {
                                                                        completeInduction();
                                                      }
                                        });
                              }

                              function completeInduction() {
                                        state.initializing = false;
                                        document.body.classList.remove('system-initializing');
                                        document.body.classList.add('system-online');

          gsap.to(overlay, { 
                              opacity: 0, 
                        duration: 1.5, 
                        ease: "power4.inOut",
                        onComplete: () => {
                                          overlay.style.visibility = 'hidden';
                                          startMainEngine();
                        }
          });
                              }

                              // 3. Main Dashboard Engine
                              function startMainEngine() {
                                        initNavigationSystem();
                                        initBpmSimulation();
                                        initScrollEffects();
                                        console.log("MOVE Elite Engine Online. Archetype:", state.archetype);
                              }

                              function initNavigationSystem() {
                                        navItems.forEach(item => {
                                                      item.addEventListener('click', (e) => {
                                                                        e.preventDefault();
                                                                        const viewId = `${item.dataset.view}-view`;

                                                                                            navItems.forEach(n => n.classList.remove('active'));
                                                                        item.classList.add('active');

                                                                                            pageViews.forEach(view => {
                                                                                                                  view.classList.remove('active');
                                                                                                                  if (view.id === viewId) view.classList.add('active');
                                                                                              });

                                                                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                                      });
                                        });
                              }
      function initBpmSimulation() {
                setInterval(() => {
                              const delta = Math.floor(Math.random() * 5) - 2;
                              state.lastBpm = Math.min(Math.max(60, state.lastBpm + delta), 180);
                              if (bpmDisplay) bpmDisplay.textContent = state.lastBpm;

                                        const hud = document.getElementById('bio-hud');
                              if (hud) {
                                                if (state.lastBpm > 140) hud.classList.add('stress-zone');
                                                else hud.classList.remove('stress-zone');
                              }
                }, 1200);
      }

                              function initScrollEffects() {
                                        const header = document.getElementById('main-header');
                                        window.addEventListener('scroll', () => {
                                                      if (header) {
                                                                        if (window.scrollY > 40) header.classList.add('scrolled');
                                                                        else header.classList.remove('scrolled');
                                                      }
                                        });
                              }

                              if (scanBtn) {
                                        scanBtn.addEventListener('click', () => {
                                                      const scan = document.createElement('div');
                                                      scan.className = 'system-scanline';
                                                      document.body.appendChild(scan);
                                                      setTimeout(() => scan.remove(), 2000);
                                        });
                              }
});
