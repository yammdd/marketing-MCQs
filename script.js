const soundCorrect = new Audio('sound/true.wav');
const soundWrong = new Audio('sound/wrong.wav');

soundCorrect.volume = 0.5;
soundWrong.volume = 0.5;

let allQuestions = [];     
let currentModeList = [];  
let currentIdx = 0;         
let answeredData = {};     
let globalWrongQueue = [];  
let isReviewMode = false;  
let sessionCounter = 0;     

const AUTO_NEXT_DELAY = 2000; 
const REVIEW_INTERVAL = 15;   
let scores = { correct: 0, wrong: 0 };

async function init() {
    const res = await fetch('questions.json');
    allQuestions = await res.json();
    allQuestions = allQuestions.map((q, i) => ({...q, originalIdx: i + 1, id: q.id || i + 1}));
    
    currentModeList = [...allQuestions];
    renderNav();
    showQuestion(0);
}

function showQuestion(index) {
    currentIdx = index;
    const q = currentModeList[index];
    
    document.getElementById('question-number').innerText = `Câu hỏi ${q.originalIdx}`;
    document.getElementById('question-text').innerText = q.question;
    updateProgressBar();
    
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    
    q.options.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'option-item';
        div.innerHTML = `<strong>${opt.label}.</strong> ${opt.text}`;
        
        if (q.tempAnswered) {
            applyResultStyles(div, opt.label, q.answer, q.tempAnswered);
        } else {
            div.onclick = () => handleSelection(index, opt.label, div);
        }
        container.appendChild(div);
    });

    updateNavActive();
}

function handleSelection(idx, label, element) {
    const q = currentModeList[idx];
    if (q.tempAnswered) return;

    q.tempAnswered = label; 

    if (label === q.answer) {
        soundCorrect.currentTime = 0;
        soundCorrect.play();
        element.classList.add('correct');
        if (isReviewMode) {
            scores.correct++;
            scores.wrong--; 
        } else {
            scores.correct++;
        }
        answeredData[q.id] = label; 
    } else {
        soundWrong.currentTime = 0;
        soundWrong.play();
        element.classList.add('wrong');
        if (!isReviewMode) {
            scores.wrong++;
            answeredData[q.id] = label;
        } 
        if (!globalWrongQueue.find(item => item.id === q.id)) {
            globalWrongQueue.push(q);
        }
        Array.from(document.querySelectorAll('.option-item')).forEach(el => {
            if (el.innerText.startsWith(q.answer)) el.classList.add('correct');
        });
    }

    updateStats();
    if (!isReviewMode) sessionCounter++; 
    renderNav();

    setTimeout(() => {
        if (currentIdx === idx) {
            checkFlow();
        }
    }, AUTO_NEXT_DELAY);
}

function checkFlow() {
    if (isReviewMode) {
        if (currentIdx < currentModeList.length - 1) {
            showQuestion(currentIdx + 1);
        } else {
            exitReviewMode();
        }
        return;
    }

    if (sessionCounter >= REVIEW_INTERVAL && globalWrongQueue.length > 0) {
        enterReviewMode();
    } else {
        if (currentIdx < currentModeList.length - 1) {
            showQuestion(currentIdx + 1);
        }
    }
}

function enterReviewMode() {
    isReviewMode = true;
    sessionCounter = 0;
    
    currentModeList = globalWrongQueue.map(q => ({...q, tempAnswered: null}));
    globalWrongQueue = [];

    document.getElementById('status-mode').innerText = "Chế độ: Ôn tập câu sai";
    document.getElementById('status-mode').classList.add('review');
    
    renderNav();
    showQuestion(0);
}

function exitReviewMode() {
    isReviewMode = false;
    currentModeList = [...allQuestions];
    
    document.getElementById('status-mode').innerText = "Chế độ: Bình thường";
    document.getElementById('status-mode').classList.remove('review');
    
    const nextUnanswered = currentModeList.findIndex((q, i) => !answeredData[q.id]);
    renderNav();
    showQuestion(nextUnanswered !== -1 ? nextUnanswered : 0);
}

function renderNav() {
    const grid = document.getElementById('navigation-grid');
    grid.innerHTML = '';
    currentModeList.forEach((q, i) => {
        const item = document.createElement('div');
        item.className = 'nav-item';
        
        item.innerText = q.originalIdx; 
        
        const qId = q.id;
        if (isReviewMode) {
            if (q.tempAnswered) {
                item.className += (q.tempAnswered === q.answer) ? ' answered-correct' : ' answered-wrong';
            }
        } else if (answeredData[qId]) {
            item.className += (answeredData[qId] === q.answer) ? ' answered-correct' : ' answered-wrong';
        }
        
        item.onclick = () => showQuestion(i);
        grid.appendChild(item);
    });
}

function applyResultStyles(el, label, correct, selected) {
    if (label === correct) el.classList.add('correct');
    if (label === selected && selected !== correct) el.classList.add('wrong');
}

function updateProgressBar() {
    const total = isReviewMode ? currentModeList.length : allQuestions.length;
    const progress = ((currentIdx + 1) / total) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;
}

function updateNavActive() {
    document.querySelectorAll('.nav-item').forEach((el, i) => {
        el.classList.toggle('active', i === currentIdx);
        if (i === currentIdx) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
}

document.getElementById('next-btn').onclick = () => {
    if (currentIdx < currentModeList.length - 1) showQuestion(currentIdx + 1);
};
document.getElementById('prev-btn').onclick = () => {
    if (currentIdx > 0) showQuestion(currentIdx - 1);
};

function updateStats() {
    const correctEl = document.getElementById('correct-count');
    const wrongEl = document.getElementById('wrong-count');
    if(correctEl) correctEl.innerText = scores.correct;
    if(wrongEl) wrongEl.innerText = scores.wrong;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

document.getElementById('shuffle-btn').onclick = () => {
    if (confirm("Bạn có chắc muốn xáo trộn toàn bộ các câu hỏi và bắt đầu lại không?")) {
        shuffleArray(allQuestions);
        
        answeredData = {};
        globalWrongQueue = [];
        scores = { correct: 0, wrong: 0 };
        sessionCounter = 0;
        isReviewMode = false;
        allQuestions.forEach(q => delete q.tempAnswered);
        currentModeList = [...allQuestions];
        
        document.getElementById('status-mode').innerText = "Chế độ: Bình thường";
        document.getElementById('status-mode').classList.remove('review');
        updateStats();
        renderNav();
        showQuestion(0);
        
        document.querySelector('.nav-grid-wrapper').scrollTop = 0;
    }
};

init();