(function () {
  'use strict';

  const QUIZ_FILES = ['quiz1', 'quiz2', 'quiz3', 'quiz4', 'quiz5', 'quiz6', 'quiz7'];
  const DATA_BASE = 'data';
  const CORRECT_PIN = '69696969';
  const PIN_STORAGE_KEY = 'quizPinUnlocked';

  const $ = (id) => document.getElementById(id);
  const select = (sel) => document.querySelector(sel);
  const selectAll = (sel) => document.querySelectorAll(sel);

  const pinPanel = $('pin-panel');
  const pinForm = $('pin-form');
  const pinInput = $('pin-input');
  const pinError = $('pin-error');
  const quizSelect = $('quiz-select');
  const quizList = $('quiz-list');
  const quizPanel = $('quiz-panel');
  const quizTitle = $('quiz-title');
  const progress = $('progress');
  const progressBar = $('progress-bar');
  const questionCard = $('question-card');
  const questionText = $('question-text');
  const answersList = $('answers-list');
  const btnPrev = $('btn-prev');
  const btnNext = $('btn-next');
  const btnSubmit = $('btn-submit');
  const resultsPanel = $('results-panel');
  const scoreDisplay = $('score-display');
  const scoreDetail = $('score-detail');
  const resultsReview = $('results-review');
  const btnRestart = $('btn-restart');
  const btnBackToMenu = $('btn-back-to-menu');
  const viewAllPanel = $('view-all-panel');
  const viewAllContent = $('view-all-content');
  const btnBackFromViewAll = $('btn-back-from-viewall');

  let state = {
    quizId: null,
    questions: [],
    currentIndex: 0,
    selected: [], // index -> selected answer text per question
    showResults: false
  };

  function showPanel(panel) {
    [pinPanel, quizSelect, quizPanel, viewAllPanel, resultsPanel].forEach(p => p && p.classList.add('hidden'));
    if (panel) panel.classList.remove('hidden');
  }

  function showQuizList() {
    showPanel(quizSelect);
  }

  function isPinUnlocked() {
    return sessionStorage.getItem(PIN_STORAGE_KEY) === '1';
  }

  function checkPinAndShowStart() {
    if (isPinUnlocked()) {
      showQuizList();
    } else {
      showPanel(pinPanel);
    }
  }

  function renderQuizList() {
    quizList.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.dataset.quizId = 'all';
    const allNum = document.createElement('span');
    allNum.className = 'quiz-num quiz-num-all';
    allNum.textContent = '★';
    allBtn.appendChild(allNum);
    const allLabel = document.createElement('span');
    allLabel.textContent = 'All quizzes combined';
    allBtn.appendChild(allLabel);
    allBtn.addEventListener('click', () => startQuiz('all'));
    quizList.appendChild(allBtn);

    const viewAllBtn = document.createElement('button');
    viewAllBtn.type = 'button';
    viewAllBtn.dataset.action = 'viewall';
    const viewAllNum = document.createElement('span');
    viewAllNum.className = 'quiz-num quiz-num-viewall';
    viewAllNum.textContent = '📖';
    viewAllBtn.appendChild(viewAllNum);
    const viewAllLabel = document.createElement('span');
    viewAllLabel.textContent = 'View all Q&A';
    viewAllBtn.appendChild(viewAllLabel);
    viewAllBtn.addEventListener('click', showViewAllQA);
    quizList.appendChild(viewAllBtn);

    QUIZ_FILES.forEach((id, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.quizId = id;
      const num = document.createElement('span');
      num.className = 'quiz-num';
      num.textContent = idx + 1;
      btn.appendChild(num);
      const label = document.createElement('span');
      label.textContent = `Quiz ${id.replace('quiz', '')}`;
      btn.appendChild(label);
      btn.addEventListener('click', () => startQuiz(id));
      quizList.appendChild(btn);
    });
  }

  function loadAllQuizzes() {
    return Promise.all(
      QUIZ_FILES.map((id) =>
        fetch(`${DATA_BASE}/${id}.json`)
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => [])
      )
    ).then((arrays) => arrays.filter(Array.isArray).flat());
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function showViewAllQA() {
    loadAllQuizzes().then((questions) => {
      if (!questions.length) {
        alert('No questions could be loaded.');
        return;
      }
      if (!viewAllContent) return;
      viewAllContent.innerHTML = '';
      const list = document.createElement('div');
      list.className = 'qa-list';
      questions.forEach((q, idx) => {
        const item = document.createElement('div');
        item.className = 'qa-item';
        const qEl = document.createElement('div');
        qEl.className = 'qa-question';
        qEl.innerHTML = `<span class="qa-num">${idx + 1}.</span> ${escapeHtml(q.question)}`;
        item.appendChild(qEl);
        const optionsWrap = document.createElement('div');
        optionsWrap.className = 'qa-options';
        (q.answers || []).forEach((answer) => {
          const isCorrect = answer === q.correctAnswer;
          const opt = document.createElement('div');
          opt.className = 'qa-option' + (isCorrect ? ' qa-option-correct' : '');
          opt.appendChild(document.createTextNode(answer));
          if (isCorrect) {
            const check = document.createElement('span');
            check.className = 'qa-option-check';
            check.setAttribute('aria-label', 'Correct answer');
            check.textContent = ' ✓';
            opt.appendChild(check);
          }
          optionsWrap.appendChild(opt);
        });
        item.appendChild(optionsWrap);
        list.appendChild(item);
      });
      viewAllContent.appendChild(list);
      showPanel(viewAllPanel);
    }).catch(() => alert('Could not load questions.'));
  }

  function startQuiz(quizId) {
    const isAll = quizId === 'all';
    const promise = isAll
      ? loadAllQuizzes()
      : fetch(`${DATA_BASE}/${quizId}.json`)
          .then((r) => {
            if (!r.ok) throw new Error('Quiz not found');
            return r.json();
          });

    promise
      .then((questions) => {
        const list = Array.isArray(questions) ? questions : [];
        if (list.length === 0) {
          alert(isAll ? 'No questions could be loaded.' : 'This quiz has no questions.');
          return;
        }
        state.quizId = quizId;
        state.questions = list;
        state.currentIndex = 0;
        state.selected = list.map(() => null);
        state.showResults = false;
        quizTitle.textContent = isAll ? 'All quizzes combined' : `Quiz ${quizId.replace('quiz', '')}`;
        showPanel(quizPanel);
        updateProgressBar();
        renderQuestion();
        updateNavButtons();
      })
      .catch(() => alert('Could not load quiz. Make sure you open the app from a local server (e.g. python -m http.server).'));
  }

  function updateProgressBar() {
    if (!progressBar || !state.questions.length) return;
    const pct = state.questions.length ? ((state.currentIndex + 1) / state.questions.length) * 100 : 0;
    progressBar.style.width = pct + '%';
    progressBar.setAttribute('aria-valuenow', state.currentIndex + 1);
    progressBar.setAttribute('aria-valuemin', 1);
    progressBar.setAttribute('aria-valuemax', state.questions.length);
  }

  function renderQuestion(animate) {
    const q = state.questions[state.currentIndex];
    const questionNumber = state.currentIndex + 1;
    const total = state.questions.length;
    progress.textContent = `Question ${questionNumber} of ${total}`;
    updateProgressBar();

    if (animate && questionCard) {
      questionCard.classList.remove('animate-in');
      questionCard.classList.add('animate-out');
      setTimeout(() => {
        questionCard.classList.remove('animate-out');
        fillQuestionContent(q, questionNumber, total);
        questionCard.classList.add('animate-in');
      }, 180);
    } else {
      fillQuestionContent(q, questionNumber, total);
    }

    btnSubmit.classList.toggle('hidden', state.currentIndex < state.questions.length - 1);
    btnNext.classList.toggle('hidden', state.currentIndex >= state.questions.length - 1);
  }

  function fillQuestionContent(q, questionNumber, total) {
    questionText.textContent = q.question;
    answersList.innerHTML = '';
    const selectedForThis = state.selected[state.currentIndex];
    q.answers.forEach((answer) => {
      const li = document.createElement('li');
      const optionId = `q${state.currentIndex}-${answer.slice(0, 25).replace(/\s/g, '-')}`;
      const label = document.createElement('label');
      label.className = 'answer-option' + (selectedForThis === answer ? ' selected' : '');
      label.htmlFor = optionId;
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'answer';
      input.value = answer;
      input.id = optionId;
      input.checked = selectedForThis === answer;
      input.addEventListener('change', () => {
        state.selected[state.currentIndex] = answer;
        answersList.querySelectorAll('.answer-option').forEach((el) => el.classList.remove('selected'));
        label.classList.add('selected');
      });
      label.appendChild(input);
      const text = document.createElement('span');
      text.className = 'answer-text';
      text.textContent = answer;
      label.appendChild(text);
      li.appendChild(label);
      answersList.appendChild(li);
    });
  }

  function updateNavButtons() {
    btnPrev.disabled = state.currentIndex === 0;
  }

  function goNext() {
    if (state.currentIndex < state.questions.length - 1) {
      state.currentIndex++;
      renderQuestion(true);
      updateNavButtons();
    }
  }

  function goPrev() {
    if (state.currentIndex > 0) {
      state.currentIndex--;
      renderQuestion(true);
      updateNavButtons();
    }
  }

  function submitQuiz() {
    let correct = 0;
    const results = state.questions.map((q, i) => {
      const chosen = state.selected[i];
      const right = chosen === q.correctAnswer;
      if (right) correct++;
      return { question: q.question, chosen, correctAnswer: q.correctAnswer, right };
    });

    const total = state.questions.length;
    scoreDisplay.innerHTML = `${correct} <span class="total">/ ${total}</span>`;
    const scoreDetailEl = scoreDetail;
    if (scoreDetailEl) {
      scoreDetailEl.innerHTML = `<p>You got <strong>${correct}</strong> out of <strong>${total}</strong> correct.</p>`;
    }

    if (resultsReview) {
      resultsReview.innerHTML = '';
      const list = document.createElement('div');
      list.className = 'results-review-list';
      results.forEach((r, idx) => {
        const item = document.createElement('div');
        item.className = 'result-item' + (r.right ? ' result-item-right' : ' result-item-wrong');
        const header = document.createElement('div');
        header.className = 'result-item-header';
        const badge = document.createElement('span');
        badge.className = 'result-badge' + (r.right ? ' result-badge-right' : ' result-badge-wrong');
        badge.textContent = r.right ? 'Correct' : 'Wrong';
        const num = document.createElement('span');
        num.className = 'result-item-num';
        num.textContent = (idx + 1) + '.';
        header.appendChild(num);
        header.appendChild(badge);
        item.appendChild(header);
        const qEl = document.createElement('div');
        qEl.className = 'result-item-question';
        qEl.textContent = r.question;
        item.appendChild(qEl);
        const yourEl = document.createElement('div');
        yourEl.className = 'result-item-your';
        yourEl.innerHTML = '<strong>Your answer:</strong> ' + (r.chosen ? escapeHtml(r.chosen) : '<em>No answer</em>');
        item.appendChild(yourEl);
        if (!r.right) {
          const correctEl = document.createElement('div');
          correctEl.className = 'result-item-correct';
          correctEl.innerHTML = '<strong>Correct answer:</strong> ' + escapeHtml(r.correctAnswer);
          item.appendChild(correctEl);
        }
        list.appendChild(item);
      });
      resultsReview.appendChild(list);
    }

    showPanel(resultsPanel);
  }

  btnPrev.addEventListener('click', goPrev);
  btnNext.addEventListener('click', goNext);
  btnSubmit.addEventListener('click', submitQuiz);
  btnRestart.addEventListener('click', showQuizList);
  if (btnBackToMenu) btnBackToMenu.addEventListener('click', showQuizList);
  if (btnBackFromViewAll) btnBackFromViewAll.addEventListener('click', showQuizList);

  if (pinForm && pinInput) {
    pinInput.addEventListener('input', () => {
      pinInput.value = pinInput.value.replace(/\D/g, '').slice(0, 8);
    });
    pinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = pinInput.value.trim();
      pinError.classList.add('hidden');
      if (value.length !== 8) {
        pinError.textContent = 'Please enter 8 digits.';
        pinError.classList.remove('hidden');
        return;
      }
      if (value === CORRECT_PIN) {
        sessionStorage.setItem(PIN_STORAGE_KEY, '1');
        pinInput.value = '';
        showQuizList();
      } else {
        pinError.textContent = 'Incorrect PIN. Try again.';
        pinError.classList.remove('hidden');
        pinInput.select();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (quizPanel.classList.contains('hidden')) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (state.currentIndex < state.questions.length - 1) goNext();
      else submitQuiz();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (state.currentIndex < state.questions.length - 1) goNext();
      else submitQuiz();
    }
  });

  renderQuizList();
  checkPinAndShowStart();
})();
