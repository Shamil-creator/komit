// Mobile menu toggle
document.addEventListener('DOMContentLoaded', () => {
  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');

  if (burger && nav) {
    burger.addEventListener('click', () => {
      burger.classList.toggle('active');
      nav.classList.toggle('active');
      document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
    });

    // Close menu on link click
    nav.querySelectorAll('.header__link').forEach(link => {
      link.addEventListener('click', () => {
        burger.classList.remove('active');
        nav.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const headerHeight = document.querySelector('.header').offsetHeight;
        const top = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  // Header shadow on scroll
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 10) {
      header.style.boxShadow = '0 2px 20px rgba(0,0,0,0.08)';
    } else {
      header.style.boxShadow = 'none';
    }
  });

  // Simple scroll animations
  const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll(
    '.hero__title, .hero__subtitle, .hero__cta, ' +
    '.section-label:not(.section-label--no-animate), ' +
    '.mission__title--white, .mission__text, .mission__divider, .mission__title--orange, ' +
    '.process__step, ' +
    '.about__text, .about__stats li, ' +
    '.contact__title, .contact__subtitle, .contact__field, .contact__submit'
  ).forEach(el => {
    el.classList.add('animate');
    observer.observe(el);
  });

  // Process section step animation
  const processSteps = document.querySelector('.process__steps');
  const processItems = processSteps ? Array.from(processSteps.querySelectorAll('.process__step')) : [];
  const processDot = processSteps ? processSteps.querySelector('.process__step-dot') : null;
  const processLine = processSteps ? processSteps.querySelector('.process__line-container') : null;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const processDesktop = window.matchMedia('(min-width: 1025px)');

  let activeProcessIndex = 0;
  let processPositions = [];
  let processTimers = [];
  let processRunning = false;
  let processVisible = false;

  const moveDuration = 700;
  const holdDuration = 950;
  const initialHoldDuration = 1100;

  const highlightProcessStep = (index) => {
    processItems.forEach((step, stepIndex) => {
      step.classList.toggle('process__step--active', stepIndex === index);
    });
  };

  const clearProcessStepHighlight = () => {
    processItems.forEach(step => {
      step.classList.remove('process__step--active');
    });
  };

  const setActiveProcessStep = (index, immediate = false) => {
    activeProcessIndex = index;
    highlightProcessStep(index);

    if (!processDot || processPositions[index] == null) {
      return;
    }

    if (immediate) {
      const previousTransition = processDot.style.transition;
      processDot.style.transition = 'none';
      processDot.style.transform = `translate(${processPositions[index]}px, -50%) translateX(-50%)`;
      processDot.offsetHeight;
      processDot.style.transition = previousTransition;
      return;
    }

    processDot.style.transform = `translate(${processPositions[index]}px, -50%) translateX(-50%)`;
  };

  const updateProcessPositions = () => {
    if (!processSteps || !processLine || processItems.length === 0) {
      return;
    }

    const lineRect = processLine.getBoundingClientRect();

    processPositions = processItems.map(step => {
      const title = step.querySelector('.process__step-title');
      const targetRect = (title || step).getBoundingClientRect();
      return targetRect.left + targetRect.width / 2 - lineRect.left;
    });

    setActiveProcessStep(activeProcessIndex, true);
  };

  const clearProcessTimers = () => {
    processTimers.forEach(timer => window.clearTimeout(timer));
    processTimers = [];
  };

  const queueProcessTimer = (callback, delay) => {
    const timer = window.setTimeout(() => {
      processTimers = processTimers.filter(activeTimer => activeTimer !== timer);
      callback();
    }, delay);

    processTimers.push(timer);
  };

  const scheduleNextProcessStep = (delay) => {
    if (!processRunning || processItems.length === 0) {
      return;
    }

    queueProcessTimer(() => {
      if (!processRunning || !processDot) {
        return;
      }

      const nextIndex = (activeProcessIndex + 1) % processItems.length;

      clearProcessStepHighlight();
      processDot.classList.add('process__step-dot--moving');
      processDot.style.transform = `translate(${processPositions[nextIndex]}px, -50%) translateX(-50%)`;

      queueProcessTimer(() => {
        if (!processRunning || !processDot) {
          return;
        }

        processDot.classList.remove('process__step-dot--moving');
        setActiveProcessStep(nextIndex, true);
        scheduleNextProcessStep(holdDuration);
      }, moveDuration);
    }, delay);
  };

  const startProcessAnimation = () => {
    if (processRunning || !processVisible || !processDesktop.matches || reducedMotion.matches || processItems.length === 0) {
      return;
    }

    processRunning = true;
    updateProcessPositions();
    setActiveProcessStep(0, true);
    scheduleNextProcessStep(initialHoldDuration);
  };

  const stopProcessAnimation = () => {
    processRunning = false;
    clearProcessTimers();

    if (processDot) {
      processDot.classList.remove('process__step-dot--moving');
    }
  };

  if (processSteps && processItems.length > 0) {
    updateProcessPositions();

    const processObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        processVisible = entry.isIntersecting;

        if (processVisible) {
          startProcessAnimation();
        } else {
          stopProcessAnimation();
        }
      });
    }, {
      threshold: 0.35
    });

    processObserver.observe(processSteps);

    let resizeRaf = null;
    window.addEventListener('resize', () => {
      if (resizeRaf) {
        window.cancelAnimationFrame(resizeRaf);
      }

      resizeRaf = window.requestAnimationFrame(() => {
        updateProcessPositions();

        if (!processDesktop.matches || reducedMotion.matches) {
          stopProcessAnimation();
          setActiveProcessStep(0, true);
          return;
        }

        if (processVisible) {
          startProcessAnimation();
        }
      });
    });

    [processDesktop, reducedMotion].forEach(mediaQuery => {
      const handleMediaChange = () => {
        updateProcessPositions();

        if (!processDesktop.matches || reducedMotion.matches) {
          stopProcessAnimation();
          setActiveProcessStep(0, true);
          return;
        }

        if (processVisible) {
          startProcessAnimation();
        }
      };

      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleMediaChange);
      } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(handleMediaChange);
      }
    });
  }
});
