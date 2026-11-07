// Главный модуль: тексты, пути к ассетам, управление экранами и ходом игры.
// Чтобы изменить любой текст в игре - редактируйте только объект TEXTS ниже.

// Раньше игра пыталась симулировать альбомный вид, пока телефон физически
// портретный (поворот всей страницы через CSS, с компенсацией реального
// угла устройства). Это оказалось слишком хрупко (баги orientation-API на
// разных устройствах/браузерах - напр. iOS 16.4 - постоянно давали неверные
// расположения элементов). Теперь - классический, надёжный способ: пока
// телефон держат портретно, поверх игры показывается подсказка "поверните
// телефон" (см. .rotate-hint-overlay в style.css, работает через чистый
// @media (orientation:portrait), без JS и без каких-либо orientation-API).
// Как только телефон физически в альбомной ориентации, подсказка прячется
// и видна сама игра - раскладка внутри #app ровно та же, что на десктопе
// (никаких мобильных переопределений размеров/позиций отдельных элементов -
// именно это раньше постоянно ломалось при повороте). Единственное
// мобильное отличие - #app целиком МАСШТАБИРУЕТСЯ (CSS transform:scale),
// если реальный экран меньше контрольного размера, на котором рассчитана
// десктопная раскладка - см. updateMobileScale() ниже. Это просто
// пропорциональное уменьшение (как Ctrl+- в браузере), без переноса/
// поворота элементов, поэтому не подвержено багам с осями, в отличие от
// прежнего подхода.
// .is-mobile нужен только чтобы подсказка/масштаб не включались у
// десктопных пользователей, которые просто сузили окно браузера -
// используем min(width,height), чтобы не путать "маленький телефон" с
// "узкое, но высокое десктопное окно".
function updateIsMobileClass() {
  var isPhone = Math.min(window.innerWidth, window.innerHeight) <= 500;
  document.documentElement.classList.toggle('is-mobile', isPhone);
}

// Контрольный размер, на который рассчитана десктопная раскладка без
// обрезания (с запасом над тем, что реально нужно самому требовательному
// экрану - пазлу: квадрат + счётчик/кнопки под ним). Если реальный экран
// меньше - пропорционально уменьшаем #app, чтобы НИЧЕГО не обрезалось, а
// не чтобы точно совпасть с десктопным брейкпоинтом стилей (это разные
// вещи: брейкпоинт меняет CSS-значения, масштаб просто уменьшает картинку).
// Разные экраны требуют разного места на десктопной раскладке - викторина
// широкая (две большие фотографии по бокам + диалог, мало по высоте), пазл
// высокий (крупный квадрат + контролы под ним, мало по ширине), карточка
// скромная по обоим измерениям. Если считать ОДИН масштаб на все экраны по
// худшему случаю (викторине), пазл и карточки сжимались бы сильнее, чем им
// реально нужно - кнопки и фото выглядели мельче, чем могли бы. Поэтому
// масштаб считается ПОД ТЕКУЩИЙ активный экран - значения измерены через
// getBoundingClientRect() на десктопной раскладке (не придуманы с запасом).
var MOBILE_FIT_DEFAULT = { w: 500, h: 520 };
var MOBILE_FIT_QUIZ = { w: 1360, h: 300 };
var MOBILE_FIT_PUZZLE = { w: 500, h: 560 };
var MOBILE_FIT_CARDS = { w: 360, h: 520 };

function getMobileFit() {
  var quizSheet = document.getElementById('quiz-sheet');
  if (quizSheet && !quizSheet.hidden) return MOBILE_FIT_QUIZ;
  var activeScreen = document.querySelector('.screen--active');
  var name = activeScreen ? activeScreen.dataset.screen : null;
  if (name === 'puzzle') return MOBILE_FIT_PUZZLE;
  if (name === 'cards') return MOBILE_FIT_CARDS;
  return MOBILE_FIT_DEFAULT;
}

function clearMobileScale(app) {
  app.style.transform = '';
  app.style.transformOrigin = '';
  app.style.position = '';
  app.style.left = '';
  app.style.top = '';
  app.style.width = '';
  app.style.height = '';
}

function updateMobileScale() {
  var app = document.getElementById('app');
  if (!app) return;
  if (!document.documentElement.classList.contains('is-mobile')) {
    clearMobileScale(app);
    return;
  }
  var fit = getMobileFit();
  var scale = Math.min(1, window.innerWidth / fit.w, window.innerHeight / fit.h);
  if (scale >= 1) {
    clearMobileScale(app);
    return;
  }
  app.style.position = 'fixed';
  app.style.left = '0';
  app.style.top = '0';
  app.style.width = (window.innerWidth / scale) + 'px';
  app.style.height = (window.innerHeight / scale) + 'px';
  app.style.transformOrigin = 'top left';
  app.style.transform = 'scale(' + scale + ')';
}
window.updateMobileScale = updateMobileScale;

function updateViewportVars() {
  document.documentElement.style.setProperty('--vw', window.innerWidth + 'px');
  document.documentElement.style.setProperty('--vh', window.innerHeight + 'px');
  updateIsMobileClass();
  updateMobileScale();
}
window.updateViewportVars = updateViewportVars;
updateViewportVars();
window.addEventListener('resize', updateViewportVars);
window.addEventListener('orientationchange', updateViewportVars);

// body формально остаётся скролл-контейнером (overflow:hidden просто прячет
// полосу прокрутки и блокирует прокрутку пальцем/колесом, но НЕ блокирует
// программный scrollTop/scrollLeft). Клик по кнопке переводит на неё фокус,
// и браузер иногда сам вызывает scrollIntoView для только что
// сфокусированного элемента - на нашей повёрнутой на 90deg странице это
// "подведение в видимую область" считается по нетронутой (непровёрнутой)
// геометрии и сдвигает body.scrollTop на случайную величину, из-за чего всё
// визуально съезжает (ровно это и "чинило" ручное переворачивание телефона -
// оно переcчитывало раскладку и сбрасывало сдвиг). Жёстко держим прокрутку в
// (0,0) всегда.
function resetBodyScroll() {
  if (document.body.scrollTop !== 0) document.body.scrollTop = 0;
  if (document.body.scrollLeft !== 0) document.body.scrollLeft = 0;
}
document.body.addEventListener('scroll', resetBodyScroll, { passive: true });

var TEXTS = {
  startBtn: 'Начать игру',
  rules: {
    title: 'Правила игры',
    body: [
      'Вам предстоит пройти 3 этапа. Чтобы победить в игре, необходимо успешно пройти все три этапа.',
      'Готовы?'
    ],
    startBtn: 'Начать 1-й этап'
  },
  quiz: {
    questions: [
      {
        text: 'В какой день и в каком году мы познакомились?',
        answers: [
          { text: '22.03.2023', correct: false },
          { text: '10.05.2023', correct: false },
          { text: '25.11.2023', correct: true }
        ]
      },
      {
        text: 'В какой одежде мы были в тот день?',
        answers: [
          { text: 'Я был в чёрных брюках и чёрной куртке, а ты — в сером пальто и сером берете.', correct: true },
          { text: 'Я был в синих брюках и чёрной куртке, а ты — в чёрной куртке и высоких сапогах.', correct: false },
          { text: 'Я был в белой рубашке и синих джинсах, а ты — в зелёном спортивном костюме.', correct: false }
        ]
      },
      {
        text: 'Какие первые слова я тебе сказал?',
        answers: [
          { text: 'Привет, можно познакомиться?', correct: false },
          { text: 'Ты что, не смотришь в глаза?', correct: true },
          { text: 'Как тебя зовут?', correct: false }
        ]
      }
    ],
    feedback: 'Попробуй ещё раз ❤️'
  },
  letterStage1: {
    opening: 'Моя любимая…',
    body: [
      'Помнишь нашу первую встречу? Кто бы мог подумать, что обычный день и случайно пролитый на меня кофе станут началом такой красивой истории.',
      'Когда ты пролила на меня кофе, я, конечно, немного растерялся. Но знаешь, я совсем не злился. Наоборот, мне хотелось улыбаться, потому что передо мной стояла такая милая девушка. Я смотрел на тебя и пытался скрыть своё волнение.',
      'А потом ты посмотрела на меня… И в тот момент я почувствовал что-то особенное. Мне захотелось узнать твоё имя, услышать твой голос, поговорить с тобой ещё немного. Я даже не представлял, что одна случайная встреча может так сильно запомниться.',
      'С того дня я всё чаще вспоминал тебя. Твою улыбку, взгляд и тот самый момент с кофе. Забавно, что тогда я даже не подозревал, насколько важным человеком ты станешь в моей жизни.',
      'Сейчас, оглядываясь назад, я понимаю: я бы ни за что не хотел изменить тот день. Даже если бы мне снова пришлось испачкаться кофе, я бы с удовольствием пережил всё заново.',
      'Ведь именно тогда я встретил тебя. И именно с того случайного момента началась наша история.'
    ],
    closing: 'Спасибо тебе за то, что однажды пролила на меня кофе. ❤️'
  },
  stage3: {
    title: 'Что бы вы хотели сказать самим себе в будущем?',
    body: [
      'Представьте, что прошло 5 или 10 лет. Какими вы стали? О чём мечтаете, чего уже добились и что хотели бы пожелать себе сегодняшним?',
      'Оставьте послание самим себе в будущее, которое однажды вы сможете перечитать вместе и вспомнить этот особенный момент.'
    ],
    placeholder: 'Дорогие мы из будущего…'
  },
  final: { title: 'Поздравляем! Вы успешно прошли игру ❤️' },
  stage2Cards: {
    intro: 'На следующие вопросы каждый из вас должен ответить, выразив своё мнение!',
    startBtn: 'Начать',
    nextBtn: 'Следующий',
    questions: [
      'В какой момент я тебе впервые понравился(ась)?',
      'Есть ли что-то важное, что ты от меня скрывал(а)?',
      'За какие мои качества ты меня любишь?',
      'Что нового ты хотел(а) бы попробовать сделать вместе?',
      'Как ты изменился(ась) за время наших отношений?'
    ]
  },
  buttons: {
    task: 'Задание',
    toNextStage: 'Перейти к следующему этапу',
    nextTask: 'Следующее задание',
    savePdf: 'Сохранить в PDF',
    finish: 'Завершить',
    downloadAgain: 'Скачать послание ещё раз',
    restart: 'Начать заново',
    skip: 'Пропустить ›'
  },
  envelopeHint: 'Нажми, чтобы открыть'
};

var ASSETS = {
  images: {
    logo: 'logo.png',
    home: 'glav.jpg',
    stage1Photo: 'stage1_photo.jpg',
    boy: 'boy.png',
    girl: 'girl.png',
    envelope: 'envelope.jpg',
    stage2Photo: 'stage2_photo.jpg',
    puzzle: 'puzzle.jpg',
    cardBg: 'ghm.png',
    stage3Photo: 'stage3_photo.jpg',
    pdfBackground: 'pdf_background.jpg'
  },
  video: {
    stage1: 'stage1.mp4',
    stage2: 'stage2.mp4',
    stage3: 'stage3.mp4'
  },
  audio: { main: 'main.mp3' }
};
window.ASSETS = ASSETS;

var STAGES = [
  { video: ASSETS.video.stage1, photo: ASSETS.images.stage1Photo, type: 'quiz' },
  { video: ASSETS.video.stage2, photo: ASSETS.images.stage2Photo, type: 'puzzle' },
  { video: ASSETS.video.stage3, photo: ASSETS.images.stage3Photo, type: 'message' }
];

var CONFIG = {
  videoSkipDelayMs: 3000,
  videoStallTimeoutMs: 4000
};

var STAGE_SCREENS = { video: true, photo: true, puzzle: true, message: true };

var currentStage = 0;
var currentScreenName = null;

function showScreen(name) {
  var screens = document.querySelectorAll('.screen');
  for (var i = 0; i < screens.length; i++) {
    var s = screens[i];
    if (s.dataset.screen === name) {
      s.classList.remove('screen--leaving');
      s.classList.add('screen--active');
    } else if (s.classList.contains('screen--active')) {
      s.classList.remove('screen--active');
      s.classList.add('screen--leaving');
      (function (el) {
        setTimeout(function () { el.classList.remove('screen--leaving'); }, 650);
      })(s);
    }
  }
  currentScreenName = name;
  updateStageIndicator();
  updateMobileScale();
}

function openModal(id) { document.getElementById(id).hidden = false; }
function closeModal(id) { document.getElementById(id).hidden = true; }

function updateStageIndicator() {
  var el = document.getElementById('stage-indicator');
  if (STAGE_SCREENS[currentScreenName] && currentStage > 0) {
    el.textContent = 'Этап ' + currentStage + ' из 3';
    el.hidden = false;
  } else {
    el.hidden = true;
  }
}

// Вход в fullscreen меняет innerWidth/innerHeight не сразу синхронно -
// пересчитываем --vw/--vh ещё пару раз с задержкой, чтобы точно поймать
// финальный размер (а не только момент до/в начале перехода).
function afterFullscreenTransition() {
  updateViewportVars();
  setTimeout(updateViewportVars, 150);
  setTimeout(updateViewportVars, 500);
}

function requestFullscreen() {
  var el = document.documentElement;
  var req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
  if (!req) {
    afterFullscreenTransition();
    return;
  }
  try {
    var result = req.call(el);
    if (result && result.then) {
      result.then(afterFullscreenTransition).catch(afterFullscreenTransition);
    } else {
      afterFullscreenTransition();
    }
  } catch (e) {
    afterFullscreenTransition();
  }
}

document.addEventListener('fullscreenchange', updateViewportVars);
document.addEventListener('webkitfullscreenchange', updateViewportVars);

/* ===================== Экран загрузки ===================== */

// Предзагруженные <video>-элементы по URL - чтобы при самом показе этапа
// playStageVideo() не запускал файл заново с нуля (а значит, повторную
// закачку/подвисание), а просто показывал уже прогруженный элемент.
var PRELOADED_VIDEOS = {};

// Ждём на экране загрузки вообще все файлы - картинки, музыку и видео,
// иначе видео потом подгружается прямо во время игры и подвисает/дёргается.
// <video>/<audio> для предзагрузки обязательно добавляем в DOM (не просто
// new Audio()/createElement без вставки) - некоторые мобильные браузеры
// приостанавливают загрузку медиаэлементов, которые не находятся в документе.
function preloadAssets(onProgress, onDone) {
  var items = [];
  Object.keys(ASSETS.images).forEach(function (k) { items.push({ type: 'image', url: ASSETS.images[k] }); });
  Object.keys(ASSETS.video).forEach(function (k) { items.push({ type: 'video', url: ASSETS.video[k] }); });
  items.push({ type: 'audio', url: ASSETS.audio.main });

  var total = items.length;
  var loaded = 0;
  var done = false;

  function finish() {
    if (done) return;
    done = true;
    onDone();
  }

  function settle() {
    if (done) return;
    loaded++;
    onProgress(loaded, total);
    if (loaded >= total) finish();
  }

  if (total === 0) { finish(); return; }

  items.forEach(function (item) {
    if (item.type === 'image') {
      var img = new Image();
      img.onload = settle;
      img.onerror = settle;
      img.src = item.url;
    } else if (item.type === 'video') {
      var video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      video.oncanplaythrough = settle;
      video.onerror = settle;
      video.src = item.url;
      video.style.display = 'none';
      document.body.appendChild(video);
      video.load();
      PRELOADED_VIDEOS[item.url] = video;
    } else if (item.type === 'audio') {
      var audio = new Audio();
      audio.preload = 'auto';
      audio.oncanplaythrough = settle;
      audio.onloadeddata = settle;
      audio.onerror = settle;
      audio.src = item.url;
      document.body.appendChild(audio);
      audio.style.display = 'none';
      audio.load();
    }
  });

  // Защита: если какой-то файл никогда не "доложит" о своей загрузке
  // (ограничения мобильного браузера/сети), экран загрузки не должен
  // застрять навсегда.
  setTimeout(finish, 60000);
}

function updateMuteIcon() {
  document.getElementById('mute-toggle').textContent = AudioCtl.isMuted() ? '🔇' : '🔊';
}

// Для <img> с src, прописанным прямо в HTML, запрос стартует во время
// парсинга документа и может завершиться ошибкой ещё до того, как
// выполнится наш (defer) скрипт и повесит onerror - поэтому дополнительно
// проверяем complete+naturalWidth на случай, если ошибка уже произошла.
function wireStaticImgFallback(imgId, placeholderId) {
  var img = document.getElementById(imgId);
  var placeholder = document.getElementById(placeholderId);
  function showPlaceholder() {
    img.style.display = 'none';
    placeholder.hidden = false;
  }
  img.onerror = showPlaceholder;
  if (img.complete && img.naturalWidth === 0) showPlaceholder();
}

function buildHearts(container, count) {
  for (var i = 0; i < count; i++) {
    var h = document.createElement('span');
    h.className = 'heart';
    h.textContent = '❤︎';
    h.style.setProperty('--x', (Math.random() * 100) + '%');
    h.style.setProperty('--delay', (Math.random() * 10).toFixed(2) + 's');
    h.style.setProperty('--duration', (10 + Math.random() * 8).toFixed(2) + 's');
    h.style.setProperty('--size', (14 + Math.random() * 16).toFixed(0) + 'px');
    container.appendChild(h);
  }
}

function buildSnow(container, count) {
  for (var i = 0; i < count; i++) {
    var f = document.createElement('span');
    f.className = 'flake';
    f.style.setProperty('--x', (Math.random() * 100) + '%');
    f.style.setProperty('--delay', (Math.random() * 12).toFixed(2) + 's');
    f.style.setProperty('--duration', (9 + Math.random() * 10).toFixed(2) + 's');
    f.style.setProperty('--size', (3 + Math.random() * 6).toFixed(1) + 'px');
    f.style.setProperty('--drift', ((Math.random() * 60) - 30).toFixed(0) + 'px');
    container.appendChild(f);
  }
}

function saveProgress(n) {
  try { localStorage.setItem('game_progress_stage', String(n)); } catch (e) {}
}
function clearProgress() {
  try {
    localStorage.removeItem('game_progress_stage');
    localStorage.removeItem('game_stage3_letter');
  } catch (e) {}
}

/* ===================== Поток этапов ===================== */

function startStage(n) {
  currentStage = n;
  updateStageIndicator();
  playStageVideo(n);
}

function playStageVideo(n) {
  showScreen('video');
  var stage = STAGES[n - 1];
  var staticVideoEl = document.getElementById('stage-video');
  var preloaded = PRELOADED_VIDEOS[stage.video];
  if (preloaded && preloaded !== staticVideoEl) {
    preloaded.id = 'stage-video';
    preloaded.className = 'stage-video';
    staticVideoEl.parentNode.replaceChild(preloaded, staticVideoEl);
  }
  var videoEl = document.getElementById('stage-video');
  var placeholder = document.getElementById('stage-video-placeholder');
  var skipBtn = document.getElementById('video-skip-btn');

  // Пока видео буферизуется, вместо чёрного экрана показываем плейсхолдер
  // (он лежит поверх видео в разметке) - прячем его только когда видео
  // реально начало показывать кадры.
  placeholder.hidden = false;
  videoEl.style.display = '';
  skipBtn.hidden = true;
  skipBtn.classList.remove('is-visible');

  var finished = false;
  var stallTimer = null;
  var skipTimer = null;

  function finishVideo() {
    if (finished) return;
    finished = true;
    clearTimeout(stallTimer);
    clearTimeout(skipTimer);
    videoEl.onplay = videoEl.onplaying = videoEl.onended = videoEl.onerror = null;
    skipBtn.onclick = null;
    try { videoEl.pause(); } catch (e) {}
    showPhotoScreen(n);
  }

  videoEl.onplaying = function () { placeholder.hidden = true; };
  videoEl.onplay = function () {
    skipTimer = setTimeout(function () {
      skipBtn.hidden = false;
      requestAnimationFrame(function () { skipBtn.classList.add('is-visible'); });
    }, CONFIG.videoSkipDelayMs);
  };
  videoEl.onended = finishVideo;
  videoEl.onerror = function () {
    videoEl.style.display = 'none';
    placeholder.hidden = false;
    finishVideo();
  };
  skipBtn.onclick = finishVideo;

  videoEl.muted = true; // у видео нет собственного звука - играет только фоновая музыка
  if (videoEl.currentSrc.indexOf(stage.video) === -1) {
    // Не было предзагруженного элемента для этого этапа - грузим с нуля.
    videoEl.src = stage.video;
    videoEl.load();
  }

  stallTimer = setTimeout(function () {
    if (videoEl.readyState < 3) {
      videoEl.style.display = 'none';
      placeholder.hidden = false;
      finishVideo();
    }
  }, CONFIG.videoStallTimeoutMs);

  videoEl.play().catch(function () {
    skipBtn.hidden = false;
    skipBtn.classList.add('is-visible');
  });
}

function showPhotoScreen(n) {
  showScreen('photo');
  var stage = STAGES[n - 1];

  var img = document.getElementById('stage-photo-img');
  var placeholder = document.getElementById('stage-photo-placeholder');
  var ctaBtn = document.getElementById('photo-cta-btn');
  var quizSheet = document.getElementById('quiz-sheet');
  var envelopeWrap = document.getElementById('envelope-wrap');
  var envelope = document.getElementById('envelope');
  var sideGirl = document.getElementById('quiz-side-girl-wrap');
  var sideBoy = document.getElementById('quiz-side-boy-wrap');
  var snowLayer = document.getElementById('photo-snow');

  snowLayer.hidden = !(stage.type === 'quiz' || stage.type === 'puzzle');

  placeholder.hidden = true;
  img.style.display = '';
  ctaBtn.hidden = true;
  quizSheet.hidden = true;
  quizSheet.classList.remove('is-visible');
  envelopeWrap.hidden = true;
  envelope.classList.remove('is-open');
  sideGirl.classList.remove('is-visible');
  sideBoy.classList.remove('is-visible');

  img.onerror = function () { img.style.display = 'none'; placeholder.hidden = false; };
  img.src = stage.photo;

  if (stage.type === 'quiz') {
    ctaBtn.hidden = false;
    ctaBtn.onclick = function () {
      ctaBtn.hidden = true;
      sideGirl.classList.add('is-visible');
      sideBoy.classList.add('is-visible');
      quizSheet.hidden = false;
      updateMobileScale();
      requestAnimationFrame(function () { quizSheet.classList.add('is-visible'); });
      Quiz.start(TEXTS.quiz.questions, onQuizComplete);
    };
  } else if (stage.type === 'puzzle') {
    ctaBtn.hidden = false;
    ctaBtn.onclick = function () {
      document.getElementById('puzzle-continue-btn').hidden = true;
      showScreen('puzzle');
      Puzzle.start(ASSETS.images.puzzle, onPuzzleComplete);
    };
  } else if (stage.type === 'message') {
    ctaBtn.hidden = false;
    ctaBtn.onclick = function () {
      showScreen('message');
      Message.start(onMessageFinish);
    };
  }
}

function onQuizComplete() {
  var quizSheet = document.getElementById('quiz-sheet');
  quizSheet.classList.remove('is-visible');
  document.getElementById('quiz-side-girl-wrap').classList.remove('is-visible');
  document.getElementById('quiz-side-boy-wrap').classList.remove('is-visible');
  setTimeout(function () { quizSheet.hidden = true; updateMobileScale(); }, 500);

  setTimeout(function () {
    var envelopeWrap = document.getElementById('envelope-wrap');
    envelopeWrap.hidden = false;
    wireEnvelope();
  }, 900);
}

function wireEnvelope() {
  var envelope = document.getElementById('envelope');
  envelope.onclick = function () {
    envelope.classList.add('is-open');
    envelope.onclick = null;
    setTimeout(openLetterModal, 700);
  };
}

function openLetterModal() {
  var body = document.getElementById('letter-paper-body');
  body.innerHTML = '';

  var open = document.createElement('p');
  var openStrong = document.createElement('strong');
  openStrong.textContent = TEXTS.letterStage1.opening;
  open.appendChild(openStrong);
  body.appendChild(open);

  TEXTS.letterStage1.body.forEach(function (para) {
    var p = document.createElement('p');
    p.textContent = para;
    body.appendChild(p);
  });

  var close = document.createElement('p');
  var closeStrong = document.createElement('strong');
  closeStrong.textContent = TEXTS.letterStage1.closing;
  close.appendChild(closeStrong);
  body.appendChild(close);

  openModal('modal-letter');
}

function onPuzzleComplete() {
  setTimeout(function () {
    document.getElementById('puzzle-continue-btn').hidden = false;
  }, 600);
}

var cardsIndex = 0;

function showCardsIntro() {
  document.getElementById('cards-intro').hidden = false;
  document.getElementById('cards-view').hidden = true;
  showScreen('cards');
}

function startCards() {
  cardsIndex = 0;
  document.getElementById('cards-intro').hidden = true;
  document.getElementById('cards-view').hidden = false;
  renderCard();
}

function renderCard() {
  var total = TEXTS.stage2Cards.questions.length;
  document.getElementById('question-card-counter').textContent = 'Вопрос ' + (cardsIndex + 1) + ' из ' + total;
  document.getElementById('question-card-text').textContent = TEXTS.stage2Cards.questions[cardsIndex];
  document.getElementById('cards-next-btn').textContent = (cardsIndex === total - 1) ? TEXTS.buttons.toNextStage : TEXTS.stage2Cards.nextBtn;

  var card = document.getElementById('question-card');
  card.style.animation = 'none';
  void card.offsetWidth; // перезапуск анимации появления карточки
  card.style.animation = '';
}

function onCardsNext() {
  var total = TEXTS.stage2Cards.questions.length;
  if (cardsIndex < total - 1) {
    cardsIndex++;
    renderCard();
  } else {
    completeStage(2);
  }
}

function onMessageFinish() {
  completeStage(3);
}

function completeStage(n) {
  if (n < 3) {
    saveProgress(n);
    startStage(n + 1);
  } else {
    clearProgress();
    showFinal();
  }
}

function showFinal() {
  showScreen('final');
  Fireworks.launch('final');
}

function restartGame() {
  clearProgress();
  currentStage = 0;
  showScreen('home');
}

/* ===================== Применение текстов к статической разметке ===================== */

function applyTexts() {
  document.getElementById('start-game-btn').textContent = TEXTS.startBtn;

  var rulesBox = document.querySelector('#modal-rules .modal-box');
  rulesBox.querySelector('h2').textContent = TEXTS.rules.title;
  var rulesPs = rulesBox.querySelectorAll('p');
  rulesPs[0].textContent = TEXTS.rules.body[0];
  rulesPs[1].textContent = TEXTS.rules.body[1];
  document.getElementById('rules-start-btn').textContent = TEXTS.rules.startBtn;

  document.getElementById('video-skip-btn').textContent = TEXTS.buttons.skip;
  document.getElementById('quiz-feedback').textContent = TEXTS.quiz.feedback;
  document.querySelector('.envelope-hint').textContent = TEXTS.envelopeHint;
  document.getElementById('letter-continue-btn').textContent = TEXTS.buttons.toNextStage;

  document.getElementById('photo-cta-btn').textContent = TEXTS.buttons.task;
  document.getElementById('puzzle-continue-btn').textContent = TEXTS.buttons.nextTask;

  document.getElementById('cards-intro-text').textContent = TEXTS.stage2Cards.intro;
  document.getElementById('cards-start-btn').textContent = TEXTS.stage2Cards.startBtn;

  var msgTask = document.querySelector('.message-task');
  msgTask.querySelector('h2').textContent = TEXTS.stage3.title;
  var msgPs = msgTask.querySelectorAll('p');
  msgPs[0].textContent = TEXTS.stage3.body[0];
  msgPs[1].textContent = TEXTS.stage3.body[1];
  document.getElementById('future-letter-textarea').placeholder = TEXTS.stage3.placeholder;
  document.getElementById('save-pdf-btn').textContent = TEXTS.buttons.savePdf;
  document.getElementById('message-finish-btn').textContent = TEXTS.buttons.finish;

  document.getElementById('final-title').textContent = TEXTS.final.title;
  document.getElementById('download-again-btn').textContent = TEXTS.buttons.downloadAgain;
  document.getElementById('restart-btn').textContent = TEXTS.buttons.restart;
}

/* ===================== Инициализация ===================== */

function init() {
  applyTexts();

  // Если логотипа нет - просто скрываем его место (фон уже достаточно
  // красив сам по себе), без заметного плейсхолдера поверх лиц на фото.
  (function () {
    var img = document.getElementById('logo-img');
    function hideLogo() { document.querySelector('.logo-wrap').hidden = true; }
    img.onerror = hideLogo;
    if (img.complete && img.naturalWidth === 0) hideLogo();
  })();
  wireStaticImgFallback('quiz-side-girl', 'quiz-side-girl-placeholder');
  wireStaticImgFallback('quiz-side-boy', 'quiz-side-boy-placeholder');

  buildHearts(document.getElementById('home-hearts'), 14);
  buildHearts(document.getElementById('final-hearts'), 14);
  buildHearts(document.getElementById('puzzle-hearts'), 12);
  buildHearts(document.getElementById('cards-hearts'), 12);
  buildHearts(document.getElementById('message-hearts'), 12);
  buildSnow(document.getElementById('photo-snow'), 150);

  AudioCtl.init(ASSETS.audio.main);
  updateMuteIcon();

  document.getElementById('mute-toggle').onclick = function () {
    AudioCtl.toggleMute();
    updateMuteIcon();
  };

  document.getElementById('start-game-btn').onclick = function () {
    requestFullscreen();
    AudioCtl.startMusic();
    openModal('modal-rules');
  };
  document.getElementById('rules-start-btn').onclick = function () {
    requestFullscreen();
    closeModal('modal-rules');
    startStage(1);
  };

  document.getElementById('puzzle-continue-btn').onclick = function () { showCardsIntro(); };
  document.getElementById('cards-start-btn').onclick = function () { startCards(); };
  document.getElementById('cards-next-btn').onclick = function () { onCardsNext(); };
  document.getElementById('letter-continue-btn').onclick = function () {
    closeModal('modal-letter');
    completeStage(1);
  };

  document.getElementById('download-again-btn').onclick = function () { Message.exportPdf(); };
  document.getElementById('restart-btn').onclick = restartGame;

  var loadingScreen = document.getElementById('loading-screen');
  var loadingBarFill = document.getElementById('loading-bar-fill');
  var loadingPercent = document.getElementById('loading-percent');

  preloadAssets(function (loaded, total) {
    var pct = Math.round((loaded / total) * 100);
    loadingBarFill.style.width = pct + '%';
    loadingPercent.textContent = pct + '%';
  }, function () {
    loadingScreen.classList.add('is-hidden');

    showScreen('home');

    var savedStage = Number((function () {
      try { return localStorage.getItem('game_progress_stage') || 0; } catch (e) { return 0; }
    })());

    if (savedStage > 0 && savedStage < 3) {
      document.getElementById('resume-text').textContent = 'Продолжить с этапа ' + (savedStage + 1) + '?';
      openModal('modal-resume');
    }

    document.getElementById('resume-continue-btn').onclick = function () {
      closeModal('modal-resume');
      requestFullscreen();
      AudioCtl.startMusic();
      startStage(savedStage + 1);
    };
    document.getElementById('resume-restart-btn').onclick = function () {
      closeModal('modal-resume');
      clearProgress();
    };
  });
}

document.addEventListener('DOMContentLoaded', init);
