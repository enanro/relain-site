document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const burger = document.querySelector('.burger');
    const nav = document.querySelector('.site-nav');
    const dropdownItems = document.querySelectorAll('.site-nav__item--dropdown');

    // Модалки — могут отсутствовать на некоторых страницах
    const requestModal = document.getElementById('request-modal');
    const requestTitle = document.getElementById('request-modal-title');
    const topicInput = requestModal ? requestModal.querySelector('input[name="topic"]') : null;
    const videoModal = document.getElementById('video-modal');
    const videoModalTitle = document.getElementById('video-modal-title');
    const videoModalText = document.getElementById('video-modal-text');
    let lastFocused = null;

    const closeDropdowns = (except = null) => {
        dropdownItems.forEach((item) => {
            if (item === except) return;
            item.classList.remove('is-open');
            item.querySelector('.nav-dropdown-toggle')?.setAttribute('aria-expanded', 'false');
        });
    };

    const closeNav = () => {
        if (!nav) return;
        nav.classList.remove('is-open');
        if (burger) burger.setAttribute('aria-expanded', 'false');
        closeDropdowns();
    };

    if (burger) {
        burger.addEventListener('click', () => {
            const isOpen = nav.classList.toggle('is-open');
            burger.setAttribute('aria-expanded', String(isOpen));
            if (!isOpen) closeDropdowns();
        });
    }

    dropdownItems.forEach((item) => {
        const toggle = item.querySelector('.nav-dropdown-toggle');
        toggle?.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const isOpen = !item.classList.contains('is-open');
            closeDropdowns(item);
            item.classList.toggle('is-open', isOpen);
            toggle.setAttribute('aria-expanded', String(isOpen));
        });
    });

    document.addEventListener('click', (event) => {
        if (!event.target.closest('.site-nav__item--dropdown')) closeDropdowns();
    });

    if (nav) {
        nav.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => {
                if (window.matchMedia('(max-width: 992px)').matches) closeNav();
            });
        });
    }

    // === Модалка заявки ===
    const openRequestModal = (topic, opener) => {
        if (!requestModal) return;
        lastFocused = opener || document.activeElement;

        // Обновляем заголовок если есть
        if (requestTitle) {
            requestTitle.textContent = topic || 'Оставить заявку';
        }

        // Обновляем topic если поле существует
        const topicField = requestModal.querySelector('input[name="topic"], input[name="your-topic"]');
        if (topicField) {
            topicField.value = topic || 'Заявка с продуктовой страницы ОСПТ';
        }

        requestModal.classList.add('is-open');
        body.classList.add('modal-open');

        // Ищем поле имени в CF7 форме
        const nameInput = requestModal.querySelector('input[name="your-name"], input[name="name"]');
        if (nameInput) {
            setTimeout(() => nameInput.focus(), 100);
        }
    };

    const closeRequestModal = () => {
        if (!requestModal) return;
        requestModal.classList.remove('is-open');
        body.classList.remove('modal-open');
        if (lastFocused) lastFocused.focus();
    };

    document.querySelectorAll('[data-modal-open]').forEach((button) => {
        button.addEventListener('click', () => {
            const topic = button.dataset.topic || button.getAttribute('data-topic');
            openRequestModal(topic, button);
        });
    });

    if (requestModal) {
        requestModal.querySelectorAll('[data-modal-close]').forEach((button) => {
            button.addEventListener('click', closeRequestModal);
        });

        // Закрытие по клику на оверлей
        const overlay = requestModal.querySelector('.modal__overlay');
        if (overlay) {
            overlay.addEventListener('click', closeRequestModal);
        }
    }
    
    // === Модалка видео ===
    const openVideoModal = (title, text, opener) => {
        if (!videoModal || !videoModalTitle || !videoModalText) return;
        lastFocused = opener || document.activeElement;
        videoModalTitle.textContent = title;
        videoModalText.textContent = text;
        videoModal.classList.add('is-open');
        body.classList.add('modal-open');
        const closeBtn = videoModal.querySelector('.modal__close');
        if (closeBtn) closeBtn.focus();
    };

    const closeVideoModal = () => {
        if (!videoModal) return;
        videoModal.classList.remove('is-open');
        body.classList.remove('modal-open');
        if (lastFocused) lastFocused.focus();
    };

    document.querySelectorAll('[data-video-open]').forEach((button, index) => {
        button.addEventListener('click', () => {
            const card = button.closest('.video-card');
            const source = card ? card.dataset.video : null;
            if (source) {
                openVideoModal(`Видеоинструкция ${index + 1}`, 'Источник видео указан в data-video и готов к подключению в WordPress.', button);
            } else {
                openVideoModal(`Видеоинструкция ${index + 1}`, 'Контейнер подготовлен для локального MP4, YouTube iframe или WordPress video embed. Стороннее видео не подставлено.', button);
            }
        });
    });

    const videoListBtn = document.querySelector('[data-video-list]');
    if (videoListBtn) {
        videoListBtn.addEventListener('click', (event) => {
            openVideoModal('Другие видеоинструкции', 'Раздел подготовлен для подключения страницы или архива видеоинструкций после переноса сайта на WordPress.', event.currentTarget);
        });
    }

    if (videoModal) {
        videoModal.querySelectorAll('[data-video-close]').forEach((button) => {
            button.addEventListener('click', closeVideoModal);
        });
    }

    // === Формы ===
    // document.querySelectorAll('.js-request-form').forEach((form) => {
    //     form.addEventListener('submit', (event) => {
    //         event.preventDefault();
    //         const status = form.querySelector('.form__status');
    //         if (!form.checkValidity()) {
    //             form.reportValidity();
    //             if (status) status.textContent = 'Проверьте обязательные поля формы.';
    //             return;
    //         }
    //         if (status) status.textContent = 'Форма заполнена. Серверная отправка подключается при переносе на WordPress.';
    //         form.reset();
    //     });
    // });

    // === Escape ===
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (requestModal && requestModal.classList.contains('is-open')) closeRequestModal();
        if (videoModal && videoModal.classList.contains('is-open')) closeVideoModal();
        closeNav();
    });

    // === Resize ===
    window.addEventListener('resize', () => {
        if (!window.matchMedia('(max-width: 992px)').matches) {
            if (nav) nav.classList.remove('is-open');
            if (burger) burger.setAttribute('aria-expanded', 'false');
        }
    });

    // === Карта (только на главной) ===
    initMapRegions();

    // === Слайдер героя (только на главной) ===
    initHeroSlider();
});

// =============================================
// Карта регионов
// =============================================
function initMapRegions() {
    const regionLabels = [
        { region: '.interactive-project-region[aria-label="Ханты-Мансийский АО"]', label: '.khmao-map-label' },
        { region: '.interactive-project-region[aria-label="Якутия"]', label: '.yakutia-map-label' },
        { region: '.interactive-project-region[aria-label="Ямало-Ненецкий автономный округ"]', label: '.yanao-map-label' },
    ];

    regionLabels.forEach(({ region, label }) => {
        const regionEl = document.querySelector(region);
        const labelEl = document.querySelector(label);
        if (!regionEl || !labelEl) return;

        const show = () => labelEl.classList.add('is-visible');
        const hide = () => labelEl.classList.remove('is-visible');

        regionEl.addEventListener('mouseenter', show);
        regionEl.addEventListener('mouseleave', hide);
        regionEl.addEventListener('focus', show);
        regionEl.addEventListener('blur', hide);
    });

    // Норильск (точка)
    const norilskPoint = document.querySelector('.norilsk-map-hotspot[aria-label="Норильск"]');
    const norilskLabel = document.querySelector('.norilsk-map-label');
    if (norilskPoint && norilskLabel) {
        const show = () => {
            norilskPoint.classList.add('is-active');
            norilskLabel.classList.add('is-visible');
        };
        const hide = () => {
            norilskPoint.classList.remove('is-active');
            norilskLabel.classList.remove('is-visible');
        };
        norilskPoint.addEventListener('mouseenter', show);
        norilskPoint.addEventListener('mouseleave', hide);
        norilskPoint.addEventListener('focus', show);
        norilskPoint.addEventListener('blur', hide);
    }
}

// =============================================
// Слайдер героя
// =============================================
function initHeroSlider() {
    const heroImage = document.querySelector('.js-hero-image');
    const heroDots = Array.from(document.querySelectorAll('.hero-slider .slider-dot'));
    const heroPrevButton = document.querySelector('.slider-arrow--prev');
    const heroNextButton = document.querySelector('.slider-arrow--next');

    if (!heroImage || heroDots.length === 0) return;

    const heroSlides = heroDots.map(dot => ({
        src: dot.dataset.src,
        alt: dot.dataset.alt,
    }));

    let heroCurrentSlide = heroDots.findIndex(dot => dot.classList.contains('slider-dot--active'));
    if (heroCurrentSlide < 0) heroCurrentSlide = 0;

    let heroSlideTimer = null;

    function updateHeroDots() {
        heroDots.forEach((dot, dotIndex) => {
            const isActive = dotIndex === heroCurrentSlide;
            dot.classList.toggle('slider-dot--active', isActive);
            if (isActive) {
                dot.setAttribute('aria-current', 'true');
            } else {
                dot.removeAttribute('aria-current');
            }
        });
    }

    function setHeroSlide(index) {
        if (heroSlides.length === 0) return;
        const nextIndex = (index + heroSlides.length) % heroSlides.length;
        const slide = heroSlides[nextIndex];
        if (!slide || !slide.src) return;

        window.clearTimeout(heroSlideTimer);
        heroImage.classList.add('is-changing');

        heroImage.src = slide.src;
        heroImage.alt = slide.alt;
        heroCurrentSlide = nextIndex;
        updateHeroDots();
        heroSlideTimer = window.setTimeout(() => {
            heroImage.classList.remove('is-changing');
        }, 160);
    }

    heroDots.forEach((dot, dotIndex) => {
        dot.addEventListener('click', () => setHeroSlide(dotIndex));
    });

    heroPrevButton?.addEventListener('click', () => setHeroSlide(heroCurrentSlide - 1));
    heroNextButton?.addEventListener('click', () => setHeroSlide(heroCurrentSlide + 1));
    updateHeroDots();
}

/**
 * Lazy Load для изображений
 * Загружает изображения при попадании в область видимости
 */
function lazyLoadImages() {
    const lazyImages = document.querySelectorAll('img.lazy[data-src]:not(.loaded)');

    lazyImages.forEach(img => {
        // Проверяем, находится ли изображение в области видимости
        if (isElementInViewport(img)) {
            const src = img.dataset.src;

            // Создаем новое изображение для предзагрузки
            const tempImage = new Image();

            tempImage.onload = function () {
                img.src = src;
                img.classList.add('loaded');
                img.style.opacity = 1;
            };

            tempImage.onerror = function () {
                // В случае ошибки тоже показываем (или ставим заглушку)
                img.src = src;
                img.classList.add('loaded');
                img.style.opacity = 1;
            };

            // Плавное появление через CSS transition
            img.style.opacity = 0;
            img.style.transition = 'opacity 0.3s ease-in-out';

            // Начинаем загрузку
            tempImage.src = src;
        }
    });

    // Удаляем обработчики если все изображения загружены
    if (document.querySelectorAll('img.lazy[data-src]:not(.loaded)').length === 0) {
        window.removeEventListener('scroll', scrollHandler);
        window.removeEventListener('resize', scrollHandler);
    }
}

/**
 * Проверка видимости элемента
 * @param {HTMLElement} element - DOM элемент
 * @returns {boolean}
 */
function isElementInViewport(element) {
    const windowHeight = window.innerHeight;
    const windowTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowBottom = windowTop + windowHeight;

    const rect = element.getBoundingClientRect();
    const elementTop = rect.top + windowTop;
    const elementBottom = elementTop + rect.height;

    // Добавляем отступ для предзагрузки (200px до появления)
    const offset = 200;

    return (elementBottom >= windowTop - offset) &&
        (elementTop <= windowBottom + offset);
}

// Обработчик событий для scroll и resize
function scrollHandler() {
    requestAnimationFrame(lazyLoadImages);
}

// Запускаем при загрузке и скролле
window.addEventListener('scroll', scrollHandler);
window.addEventListener('resize', scrollHandler);

// Первичная загрузка
lazyLoadImages();

// 
// О компании
// 
document.addEventListener('DOMContentLoaded', () => {
    const reviewsSlider = document.querySelector('[data-reviews-slider]');
    if (reviewsSlider) {
        const viewport = reviewsSlider.querySelector('.reviews-slider__viewport');
        const track = reviewsSlider.querySelector('.reviews-slider__track');
        const cards = Array.from(reviewsSlider.querySelectorAll('.review-card'));
        const prevButton = reviewsSlider.querySelector('[data-reviews-prev]');
        const nextButton = reviewsSlider.querySelector('[data-reviews-next]');
        const dots = reviewsSlider.querySelector('.reviews-slider__dots');
        let current = 0;
        let maxIndex = 0;

        function getStep() {
            const card = cards[0];
            if (!card) return 0;
            const gap = Number.parseFloat(window.getComputedStyle(track).columnGap || '0');
            return card.getBoundingClientRect().width + gap;
        }

        function getVisibleCount() {
            const step = getStep();
            if (!viewport || !step) return 1;
            return Math.max(1, Math.round(viewport.getBoundingClientRect().width / step));
        }

        function renderDots() {
            if (!dots) return;
            dots.innerHTML = '';
            for (let index = 0; index <= maxIndex; index += 1) {
                const dot = document.createElement('button');
                dot.className = 'reviews-slider__dot';
                dot.type = 'button';
                dot.setAttribute('aria-label', `Показать отзыв ${index + 1}`);
                dot.addEventListener('click', () => {
                    current = index;
                    updateSlider();
                });
                dots.appendChild(dot);
            }
        }

        function updateSlider() {
            const step = getStep();
            const visibleCount = getVisibleCount();
            maxIndex = Math.max(cards.length - visibleCount, 0);
            current = Math.min(current, maxIndex);
            track.style.transform = `translateX(${-current * step}px)`;
            prevButton.disabled = current === 0;
            nextButton.disabled = current === maxIndex;
            const dotButtons = dots ? Array.from(dots.children) : [];
            if (dotButtons.length !== maxIndex + 1) {
                renderDots();
                return updateSlider();
            }
            dotButtons.forEach((dot, index) => dot.classList.toggle('is-active', index === current));
        }

        prevButton?.addEventListener('click', () => {
            current = Math.max(current - 1, 0);
            updateSlider();
        });

        nextButton?.addEventListener('click', () => {
            current = Math.min(current + 1, maxIndex);
            updateSlider();
        });

        window.addEventListener('resize', updateSlider);
        updateSlider();
    }

});

(function () {
    'use strict';

    var COOKIE_KEY = 'reline_cookie_consent';
    var COOKIE_EXPIRY_DAYS = 365;

    var cookieConsent = document.getElementById('cookie-consent');
    var acceptBtn = document.getElementById('cookie-accept');
    var moreBtn = document.getElementById('cookie-more');

    // Установка cookie
    function setCookie(name, value, days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = name + '=' + value + '; expires=' + date.toUTCString() + '; path=/';
    }

    // Получение cookie
    function getCookie(name) {
        var nameEQ = name + '=';
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i].trim();
            if (cookie.indexOf(nameEQ) === 0) {
                return cookie.substring(nameEQ.length);
            }
        }
        return null;
    }

    // Проверка согласия
    function hasConsent() {
        var consent = getCookie(COOKIE_KEY);
        return consent === 'accepted';
    }

    // Показать всплывашку
    function showConsent() {

        if (hasConsent()) {
            if (cookieConsent) {
                cookieConsent.classList.remove('active');
            }
            return;
        }

        if (!cookieConsent) {
            console.error('Элемент cookie-consent не найден!');
            return;
        }

        setTimeout(function () {
            cookieConsent.classList.add('active');
        }, 1500);
    }

    // Принять cookie
    function acceptCookies() {
        setCookie(COOKIE_KEY, 'accepted', COOKIE_EXPIRY_DAYS);
        if (cookieConsent) {
            cookieConsent.classList.remove('active');
        }
    }

    // Подробнее
    function moreInfo(event) {
        event.preventDefault();
        var policyLink = document.querySelector('.cookie-consent__text a');
        if (policyLink) {
            window.location.href = policyLink.getAttribute('href');
        } else {
            console.warn('Ссылка на политику не найдена');
        }
    }

    // Инициализация
    function initCookieConsent() {

        if (!cookieConsent) {
            console.error('Элемент cookie-consent не найден при инициализации!');
            return;
        }

        // Принудительно показываем для теста (уберем позже)
        // cookieConsent.classList.add('active');

        showConsent();

        if (acceptBtn) {
            acceptBtn.addEventListener('click', acceptCookies);
        } 

    }

    // Запуск
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCookieConsent);
    } else {
        console.log('DOM уже загружен');
        initCookieConsent();
    }

    // Для отладки - делаем глобальную функцию
    window.showCookie = function () {
        var el = document.getElementById('cookie-consent');
        if (el) {
            el.classList.add('active');
        }
    };

    window.hideCookie = function () {
        var el = document.getElementById('cookie-consent');
        if (el) {
            el.classList.remove('active');
        }
    };

    window.checkCookie = function () {
        console.log('Cookie:', document.cookie);
        var el = document.getElementById('cookie-consent');
    };

})();

// CF7
document.addEventListener('DOMContentLoaded', function () {
    // Функция для получения URL страницы
    function getPageUrl() {
        return window.location.href;
    }

    // Функция для получения UTM-меток из URL
    function getUtmParams() {
        var params = new URLSearchParams(window.location.search);
        return {
            utm_source: params.get('utm_source') || '',
            utm_medium: params.get('utm_medium') || '',
            utm_campaign: params.get('utm_campaign') || '',
            utm_content: params.get('utm_content') || '',
            utm_term: params.get('utm_term') || ''
        };
    }

    // Заполняем скрытые поля
    function fillHiddenFields() {
        var utmParams = getUtmParams();

        // Заполняем URL страницы
        var pageUrlField = document.getElementById('page-url-field');
        if (pageUrlField) {
            pageUrlField.value = getPageUrl();
        }

        // Заполняем UTM-метки
        var utmMapping = {
            'utm-source-field': utmParams.utm_source,
            'utm-medium-field': utmParams.utm_medium,
            'utm-campaign-field': utmParams.utm_campaign,
            'utm-content-field': utmParams.utm_content,
            'utm-term-field': utmParams.utm_term
        };

        for (var fieldId in utmMapping) {
            var field = document.getElementById(fieldId);
            if (field) {
                field.value = utmMapping[fieldId];
            }
        }
    }

    // Заполняем при загрузке страницы
    fillHiddenFields();

    // Заполняем при открытии модального окна
    var modal = document.getElementById('request-modal');
    if (modal) {
        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.target.classList.contains('active') ||
                    mutation.target.classList.contains('open') ||
                    mutation.target.style.display === 'block') {
                    fillHiddenFields();
                }
            });
        });

        observer.observe(modal, {
            attributes: true,
            attributeFilter: ['class', 'style']
        });
    }

    // Также заполняем при AJAX-отправке CF7
    document.addEventListener('wpcf7mailsent', function (event) {
        fillHiddenFields();
    });
});

