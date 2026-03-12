// File: basic_mcq.js

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const quizForm = document.getElementById('quiz-form');
    const questionsArea = document.getElementById('questions-area');
    const timerDisplaySpan = document.querySelector('#timer span');
    const loadingState = document.getElementById('loading-state');
    const submitButton = document.getElementById('submit-quiz-button');
    const backButton = document.getElementById('back-button');
    const confirmationModal = document.getElementById('confirmation-modal');
    const confirmBackButton = document.getElementById('confirm-back-button');
    const cancelBackButton = document.getElementById('cancel-back-button');

    // --- State Variables ---
    let quizConfig = null;
    let questionBank = {}; // Will be populated dynamically from CSV
    let questionsToDisplay =[];
    let timerInterval = null;
    let timeLeft = 0;
    let startTime = null;
    let userAnswers = {};

    // --- Core Requirements & Constants ---
    const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT1LZMt3ucIv413tKRE4kcOXbQ3pU_rFnaRMR06UmTc5ZDDmtAED4BaFHTGM9VLR3mayxaE-H3nJIch/pub?output=csv';
    const LOCAL_STORAGE_KEY_CONFIG = 'basicQuizConfig';
    const LOCAL_STORAGE_KEY_RESULTS = 'basicQuizResults';
    const SETUP_PAGE_URL = 'basic_setup.html';
    const RESULT_PAGE_URL = 'basic_result.html';

    // Ratios & Priorities as per requirements
    const DISPLAY_PRIORITY = ["English", "Math", "Physics", "Chemistry", "Biology"];
    const REMAINDER_PRIORITY = ["Math", "English", "Physics", "Biology", "Chemistry"];

    // --- CSS Injection: Dopamine Hitter Style ---
    const injectStyles = () => {
        if (document.getElementById('dopamine-styles')) return;
        const style = document.createElement('style');
        style.id = 'dopamine-styles';
        style.innerHTML = `
            /* Dopamine Styling - Isolated classes to prevent clashing with external CSS */
            .dopamine-card {
                background: #ffffff;
                border-radius: 12px;
                padding: 24px;
                margin-bottom: 24px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04);
                border: 1px solid #eef2f6;
                transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s ease;
            }
            .dopamine-card:hover {
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
                transform: translateY(-2px);
            }
            .dopamine-options label {
                display: flex;
                align-items: center;
                padding: 14px 20px;
                margin: 10px 0;
                border-radius: 10px;
                background: #f8fafc;
                cursor: pointer;
                border: 2px solid transparent;
                transition: all 0.2s ease-in-out;
                font-size: 16px;
                color: #334155;
            }
            .dopamine-options label:hover {
                background: #f1f5f9;
                border-color: #cbd5e1;
            }
            .dopamine-options label.selected {
                background: #eff6ff;
                border-color: #3b82f6;
                color: #1d4ed8;
                font-weight: 500;
                box-shadow: 0 4px 10px rgba(59, 130, 246, 0.1);
            }
            .dopamine-options input[type="radio"] {
                display: none;
            }
            .dopamine-subject-title {
                font-size: 1.5rem;
                color: #1e293b;
                border-bottom: 3px solid #3b82f6;
                padding-bottom: 8px;
                margin-top: 32px;
                margin-bottom: 24px;
                display: inline-block;
            }
            .error-message {
                color: #ef4444;
                background: #fef2f2;
                padding: 16px;
                border-radius: 8px;
                border: 1px solid #fca5a5;
                font-weight: bold;
                text-align: center;
            }
        `;
        document.head.appendChild(style);
    };

    // --- Initialization & Fetching ---
    async function initQuiz() {
        injectStyles();
        
        // 1. Load Config
        const configString = localStorage.getItem(LOCAL_STORAGE_KEY_CONFIG);
        if (!configString) {
            handleError(`Quiz configuration not found. Please <a href="${SETUP_PAGE_URL}">set up the quiz</a> first.`);
            return;
        }
        quizConfig = JSON.parse(configString);

        // Ensure Math is included if it's broadly required
        if (!quizConfig.selectedSubjects.includes("Math")) {
            quizConfig.selectedSubjects.push("Math");
        }

        // 2. Fetch from Google Sheets CSV
        loadingState.classList.remove('hidden');
        if (quizForm) quizForm.classList.add('hidden');

        try {
            const response = await fetch(CSV_URL);
            const csvText = await response.text();
            questionBank = parseCSVToQuestionBank(csvText);
        } catch (error) {
            handleError(`Failed to fetch questions from database. Please check your internet connection and <a href="${SETUP_PAGE_URL}">try again</a>.`);
            return;
        }

        startTime = Date.now();

        // 3. Prepare Questions
        questionsToDisplay = selectQuestions();
        if (!questionsToDisplay || questionsToDisplay.length === 0) {
            handleError(`Could not load questions based on your settings. Please <a href="${SETUP_PAGE_URL}">try again</a>.`);
            return;
        }

        // 4. Render Questions
        renderQuestions();

        // 5. Start Timer
        timeLeft = quizConfig.timeLimit * 60;
        startTimer();

        // 6. Show Form, Hide Loading
        loadingState.classList.add('hidden');
        quizForm.classList.remove('hidden');
    }

    // --- UPADTED CSV Parsing Logic For Your Specific Structure ---
    function parseCSVToQuestionBank(csvText) {
        const rows = csvToArray(csvText);
        if (rows.length < 2) return {};

        const bank = {};

        // Based on sheet structure:
        // Col 0: S.N
        // Col 1: Question
        // Col 2: Right Option
        // Col 3: Distractor_1
        // Col 4: Distractor_2
        // Col 5: Distractor_3
        // Col 6: Code (p, e, c, b, m)

        for (let i = 1; i < rows.length; i++) {
            const r = rows[i];
            if (r.length < 7) continue; // Skip broken or empty rows

            const questionText = r[1];
            const rightOption = r[2];
            const dist1 = r[3];
            const dist2 = r[4];
            const dist3 = r[5];
            const code = r[6];

            if (!questionText || !rightOption || !code) continue;

            const subject = standardizeSubject(code);

            // We securely assign the "Right Option" to 'optA'.
            // Even though it is shuffled later, the correctOptionId will correctly map to it.
            let options =[
                { id: 'optA', text: rightOption },
                { id: 'optB', text: dist1 },
                { id: 'optC', text: dist2 },
                { id: 'optD', text: dist3 }
            ].filter(o => o.text && o.text.trim() !== "");

            if (!bank[subject]) bank[subject] = [];

            bank[subject].push({
                id: `q_${subject}_${i}`,
                subject: subject,
                questionText: questionText,
                options: options,
                correctOptionId: 'optA' // 'optA' holds the text from "Right Option"
            });
        }
        return bank;
    }

    // Helper: Standardize Subject Codes strictly mapped to your codes (p, e, c, b, m)
    function standardizeSubject(code) {
        const c = code.toLowerCase().trim();
        if (c === 'p' || c.includes('phy')) return 'Physics';
        if (c === 'e' || c.includes('eng')) return 'English';
        if (c === 'c' || c.includes('chem')) return 'Chemistry';
        if (c === 'b' || c.includes('bio')) return 'Biology';
        if (c === 'm' || c.includes('math')) return 'Math';
        return code; // fallback
    }

    // Helper: Robust CSV to Array Regex
    function csvToArray(strData, strDelimiter = ",") {
        const objPattern = new RegExp(("(\\" + strDelimiter + "|\\r?\\n|\\r|^)" + "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" + "([^\"\\" + strDelimiter + "\\r\\n]*))"), "gi");
        let arrData = [[]], arrMatches = null;
        while (arrMatches = objPattern.exec(strData)) {
            let strMatchedDelimiter = arrMatches[1];
            if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) arrData.push([]);
            let strMatchedValue;
            if (arrMatches[2]) strMatchedValue = arrMatches[2].replace(new RegExp("\"\"", "g"), "\"");
            else strMatchedValue = arrMatches[3];
            arrData[arrData.length - 1].push(strMatchedValue);
        }
        return arrData.filter(row => row.join('').trim() !== ''); // Remove completely empty rows
    }

    // --- Question Selection & Distribution ---
    function selectQuestions() {
        const numQuestions = quizConfig.numQuestions;
        let availableQuestions = {};
        
        // Ensure only mapped subjects are selected
        quizConfig.selectedSubjects.forEach(subject => {
            if (questionBank[subject] && questionBank[subject].length > 0) {
                availableQuestions[subject] = [...questionBank[subject]];
            }
        });

        const actualSubjectsAvailable = Object.keys(availableQuestions);
        if (actualSubjectsAvailable.length === 0) return [];

        let finalQuestions =[];
        let questionsPerSubject = Math.floor(numQuestions / actualSubjectsAvailable.length);
        let remainder = numQuestions % actualSubjectsAvailable.length;

        // Init base distribution
        const subjectCounts = {};
        actualSubjectsAvailable.forEach(s => subjectCounts[s] = questionsPerSubject);

        // Sort available subjects based on REMAINDER priority
        const sortedForRemainder =[...actualSubjectsAvailable].sort((a, b) => {
            return REMAINDER_PRIORITY.indexOf(a) - REMAINDER_PRIORITY.indexOf(b);
        });

        // Distribute remainder
        while (remainder > 0) {
            let assigned = false;
            for (let i = 0; i < sortedForRemainder.length; i++) {
                let subj = sortedForRemainder[i];
                if (subjectCounts[subj] < availableQuestions[subj].length) {
                    subjectCounts[subj]++;
                    remainder--;
                    assigned = true;
                    if (remainder === 0) break;
                }
            }
            if (!assigned) break; // Break loop if all subjects are drained
        }

        actualSubjectsAvailable.forEach(subject => {
            let countForThisSubject = subjectCounts[subject];
            countForThisSubject = Math.min(countForThisSubject, availableQuestions[subject].length);

            const subjectPool = availableQuestions[subject];
            shuffleArray(subjectPool); // Randomize questions selection
            const pickedQuestions = subjectPool.slice(0, countForThisSubject);

            pickedQuestions.forEach(q => {
                q.subject = subject;
                userAnswers[q.id] = null;
                // --- SHUFFLE OPTIONS RANDOMLY --- (Satisfies Req #1)
                shuffleArray(q.options); 
            });

            finalQuestions.push(...pickedQuestions);
        });

        // Sort for final visual display (Satisfies Display Ratio Priority Req #5)
        finalQuestions.sort((a, b) => {
             return DISPLAY_PRIORITY.indexOf(a.subject) - DISPLAY_PRIORITY.indexOf(b.subject);
        });

        quizConfig.numQuestions = finalQuestions.length; // Ensure accurate submission total
        return finalQuestions;
    }

    // Fisher-Yates Shuffle
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));[array[i], array[j]] = [array[j], array[i]];
        }
    }

    // --- Rendering Questions ---
    function renderQuestions() {
        questionsArea.innerHTML = '';
        let currentSubject = null;
        let subjectGroupDiv = null;
        let questionCounter = 0;

        questionsToDisplay.forEach(q => {
            questionCounter++;
            if (q.subject !== currentSubject) {
                currentSubject = q.subject;
                subjectGroupDiv = document.createElement('div');
                subjectGroupDiv.className = 'subject-group';
                // Dopamine Title Injection
                subjectGroupDiv.innerHTML = `<h2 class="dopamine-subject-title">${currentSubject}</h2>`;
                questionsArea.appendChild(subjectGroupDiv);
            }

            const questionCard = document.createElement('div');
            questionCard.className = 'question-card dopamine-card'; // Dopamine injection
            questionCard.id = `q-${q.id}`;

            const questionTextP = document.createElement('p');
            questionTextP.className = 'question-text';
            questionTextP.innerHTML = `<strong>${questionCounter}.</strong> ${q.questionText}`;
            questionCard.appendChild(questionTextP);

            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'options-group dopamine-options'; // Dopamine injection
            optionsDiv.dataset.questionId = q.id;

            q.options.forEach(opt => {
                const label = document.createElement('label');
                const radioInput = document.createElement('input');
                radioInput.type = 'radio';
                radioInput.name = q.id;
                radioInput.value = opt.id; // Keeps correct answer matching intact regardless of shuffle
                radioInput.addEventListener('change', handleAnswerChange);

                const span = document.createElement('span');
                span.textContent = ` ${opt.text}`;

                label.appendChild(radioInput);
                label.appendChild(span);
                optionsDiv.appendChild(label);
            });

            questionCard.appendChild(optionsDiv);
            if (subjectGroupDiv) subjectGroupDiv.appendChild(questionCard);
        });
    }

    // --- Timer Logic ---
    function startTimer() {
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft <= 0) { submitQuiz(true); }
            if(timeLeft <= 60 && !timerDisplaySpan.parentElement.classList.contains('warning')) {
                 timerDisplaySpan.parentElement.classList.add('warning');
             }
        }, 1000);
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplaySpan.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function stopTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    // --- Answer Handling (Responsive Visuals) ---
    function handleAnswerChange(event) {
        const input = event.target;
        userAnswers[input.name] = input.value;
        
        // Dopamine visual hit: toggle '.selected' class
        const optionsDiv = input.closest('.options-group');
        const labels = optionsDiv.querySelectorAll('label');
        labels.forEach(lbl => lbl.classList.remove('selected'));
        input.closest('label').classList.add('selected');
    }

    // --- Back Button Logic ---
    if(backButton) {
        backButton.addEventListener('click', () => {
            confirmationModal.style.display = 'flex';
        });
    }

    if(confirmBackButton) {
        confirmBackButton.addEventListener('click', () => {
            stopTimer();
            localStorage.removeItem(LOCAL_STORAGE_KEY_CONFIG);
            window.location.href = SETUP_PAGE_URL;
        });
    }

    if(cancelBackButton) {
        cancelBackButton.addEventListener('click', () => {
            confirmationModal.style.display = 'none';
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target == confirmationModal) {
            confirmationModal.style.display = 'none';
        }
    });

    // --- Submit Logic (Formats specifically to support result logic perfectly) ---
    if(quizForm) {
        quizForm.addEventListener('submit', (event) => {
            event.preventDefault();
            submitQuiz(false);
        });
    }

    function submitQuiz(isTimeOut = false) {
        stopTimer();
        if(submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';
        }

        const endTime = Date.now();
        const timeTaken = Math.round((endTime - startTime) / 1000);

        // Prepares perfectly formatted payload expected by basic_result.js
        const quizResults = {
            questionsPresented: questionsToDisplay.map(q => ({
                id: q.id,
                questionText: q.questionText,
                options: q.options, // Options state maintains shuffled layout correctly mapping ID's
                correctOptionId: q.correctOptionId,
                subject: q.subject
            })),
            userAnswers: userAnswers,
            timeTaken: timeTaken,
            totalTimeAllowed: quizConfig.timeLimit * 60,
            wasTimeOut: isTimeOut,
            totalQuestions: quizConfig.numQuestions,
            subjectsSelected: quizConfig.selectedSubjects
        };

        localStorage.setItem(LOCAL_STORAGE_KEY_RESULTS, JSON.stringify(quizResults));
        window.location.href = RESULT_PAGE_URL;
    }

    // --- Utility Functions ---
    function handleError(messageHtml) {
        console.error(messageHtml.replace(/<[^>]*>/g, '')); 
        questionsArea.innerHTML = `<p class="error-message">${messageHtml}</p>`;
        loadingState.classList.add('hidden');
        if(quizForm) quizForm.classList.add('hidden');
        stopTimer();
    }

    // --- Start the Quiz Process ---
    initQuiz();
}); 
