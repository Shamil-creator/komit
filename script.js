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
      } else {
        entry.target.classList.remove('visible');
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
  const processProgress = processSteps ? processSteps.querySelector('.process__line-progress') : null;
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

    if (processPositions[index] == null) {
      return;
    }

    const targetPosition = processPositions[index];

    if (immediate) {
      if (processDot) {
        const previousTransition = processDot.style.transition;
        processDot.style.transition = 'none';
        processDot.style.transform = `translate(${targetPosition}px, -50%) translateX(-50%)`;
        processDot.offsetHeight;
        processDot.style.transition = previousTransition;
      }

      if (processProgress) {
        const previousTransition = processProgress.style.transition;
        processProgress.style.transition = 'none';
        processProgress.style.width = `${targetPosition}px`;
        processProgress.offsetHeight;
        processProgress.style.transition = previousTransition;
      }

      return;
    }

    if (processDot) {
      processDot.style.transform = `translate(${targetPosition}px, -50%) translateX(-50%)`;
    }

    if (processProgress) {
      processProgress.style.width = `${targetPosition}px`;
    }
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
      if (!processRunning || (!processDot && !processProgress)) {
        return;
      }

      const nextIndex = (activeProcessIndex + 1) % processItems.length;

      clearProcessStepHighlight();
      if (processDot) {
        processDot.classList.add('process__step-dot--moving');
        processDot.style.transform = `translate(${processPositions[nextIndex]}px, -50%) translateX(-50%)`;
      }

      if (processProgress) {
        processProgress.style.width = `${processPositions[nextIndex]}px`;
      }

      queueProcessTimer(() => {
        if (!processRunning || (!processDot && !processProgress)) {
          return;
        }

        if (processDot) {
          processDot.classList.remove('process__step-dot--moving');
        }
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

  // Contact form
  const contactForm = document.getElementById('contact-form');

  if (contactForm) {
    const contactName = contactForm.querySelector('#contact-name');
    const contactPhone = contactForm.querySelector('#contact-phone');
    const contactMessage = contactForm.querySelector('#contact-message');

    const setContactFieldError = (field, hasError) => {
      const fieldWrapper = field ? field.closest('.contact__field') : null;
      if (!fieldWrapper) {
        return;
      }

      fieldWrapper.classList.toggle('contact__field--error', hasError);
      field.setAttribute('aria-invalid', hasError ? 'true' : 'false');
    };

    const setContactMessage = (message, type) => {
      if (!contactMessage) {
        return;
      }

      contactMessage.textContent = message;
      contactMessage.classList.remove('contact__message--error', 'contact__message--success');

      if (type) {
        contactMessage.classList.add(`contact__message--${type}`);
      }
    };

    const clearContactErrors = () => {
      [contactName, contactPhone].forEach(field => {
        if (!field) {
          return;
        }

        setContactFieldError(field, false);
      });
    };

    const getPhoneDigits = (value) => value.replace(/\D/g, '');

    const normalizePhoneDigits = (value) => {
      let digits = getPhoneDigits(value);

      if (!digits.length) {
        return '';
      }

      if (digits[0] === '8') {
        digits = `7${digits.slice(1)}`;
      } else if (digits[0] !== '7') {
        digits = `7${digits}`;
      }

      return digits.slice(0, 11);
    };

    const formatPhoneValue = (value) => {
      const digits = normalizePhoneDigits(value);

      if (!digits) {
        return '';
      }

      const localDigits = digits.slice(1);
      let formatted = '+7';

      if (localDigits.length > 0) {
        formatted += ` (${localDigits.slice(0, 3)}`;
      }

      if (localDigits.length >= 3) {
        formatted += ')';
      }

      if (localDigits.length > 3) {
        formatted += ` ${localDigits.slice(3, 6)}`;
      }

      if (localDigits.length > 6) {
        formatted += `-${localDigits.slice(6, 8)}`;
      }

      if (localDigits.length > 8) {
        formatted += `-${localDigits.slice(8, 10)}`;
      }

      return formatted;
    };

    [contactName, contactPhone].forEach(field => {
      if (!field) {
        return;
      }

      field.addEventListener('input', () => {
        if (field === contactPhone) {
          field.value = formatPhoneValue(field.value);
        }

        setContactFieldError(field, false);

        if (contactMessage && contactMessage.textContent) {
          setContactMessage('', null);
        }
      });
    });

    if (contactPhone) {
      contactPhone.addEventListener('keydown', (event) => {
        if (event.key !== 'Backspace') {
          return;
        }

        const selectionStart = contactPhone.selectionStart ?? contactPhone.value.length;
        const selectionEnd = contactPhone.selectionEnd ?? contactPhone.value.length;

        if (selectionStart !== selectionEnd || selectionStart !== contactPhone.value.length) {
          return;
        }

        const phoneDigits = normalizePhoneDigits(contactPhone.value);
        const localDigits = phoneDigits.slice(1);

        if (!phoneDigits) {
          return;
        }

        event.preventDefault();

        if (!localDigits.length) {
          contactPhone.value = '';
          return;
        }

        const nextLocalDigits = localDigits.slice(0, -1);
        contactPhone.value = nextLocalDigits ? formatPhoneValue(nextLocalDigits) : '+7';
        const caretPosition = contactPhone.value.length;
        contactPhone.setSelectionRange(caretPosition, caretPosition);
      });

      contactPhone.addEventListener('focus', () => {
        if (!contactPhone.value.trim()) {
          contactPhone.value = '+7';
        }
      });

      contactPhone.addEventListener('blur', () => {
        const phoneDigits = normalizePhoneDigits(contactPhone.value);

        if (phoneDigits.length <= 1) {
          contactPhone.value = '';
          return;
        }

        contactPhone.value = formatPhoneValue(contactPhone.value);
      });
    }

    contactForm.addEventListener('submit', (event) => {
      event.preventDefault();

      clearContactErrors();

      const nameValue = contactName ? contactName.value.trim() : '';
      const phoneValue = contactPhone ? contactPhone.value.trim() : '';
      const phoneDigits = normalizePhoneDigits(phoneValue);

      if (nameValue.length < 2) {
        setContactFieldError(contactName, true);
        setContactMessage('Введите имя, чтобы мы понимали, как к вам обратиться.', 'error');
        contactName.focus();
        return;
      }

      if (phoneDigits.length < 11) {
        setContactFieldError(contactPhone, true);
        setContactMessage('Введите корректный номер телефона.', 'error');
        contactPhone.focus();
        return;
      }

      const savedLeads = JSON.parse(window.localStorage.getItem('komit-contact-requests') || '[]');
      savedLeads.push({
        name: nameValue,
        phone: phoneValue,
        createdAt: new Date().toISOString()
      });
      window.localStorage.setItem('komit-contact-requests', JSON.stringify(savedLeads));

      contactForm.reset();
      setContactMessage('Заявка сохранена в браузере. Для отправки менеджеру позже можно подключить backend.', 'success');
    });
  }
});
