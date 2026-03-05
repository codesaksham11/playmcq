// /basic_setup.js

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM References ---
    const form = document.getElementById('quiz-setup-form');
    const numQuestionsInput = document.getElementById('num-questions');
    const timeLimitInput = document.getElementById('time-limit');
    const startButton = document.getElementById('start-quiz-button');
    const backButton = document.getElementById('back-button');

    // Error message elements
    const numQuestionsError = document.getElementById('num-questions-error');
    const timeLimitError = document.getElementById('time-limit-error');

    // Status message area (for validation/UX feedback)
    const accessStatusMessageDiv = document.getElementById('access-status-message');

    // --- Constants ---
    const QUIZ_TYPE = 'basic';
    const TARGET_MCQ_FILE = 'basic_mcq.html';
    const CONFIG_STORAGE_KEY = 'basicQuizConfig';
    const FIXED_SUBJECTS = ["Physics", "Chemistry", "Biology", "English"];

    // --- Navigation ---
    if (backButton) {
        backButton.addEventListener('click', () => {
            window.location.href = '/';
        });
    } else {
        console.warn("Back button element not found.");
    }

    // --- Form Submission Logic (Simplified - No Access Check) ---
    if (form) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            clearAccessStatusMessage();

            if (validateForm()) {
                // Collect config data
                const numQuestions = parseInt(numQuestionsInput.value, 10);
                const timeLimit = parseInt(timeLimitInput.value, 10);
                const selectedSubjects = FIXED_SUBJECTS; // Fixed subjects for Basic

                const quizConfig = {
                    numQuestions: numQuestions,
                    timeLimit: timeLimit,
                    selectedSubjects: selectedSubjects,
                    quizType: QUIZ_TYPE
                };

                // Save config to localStorage
                localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(quizConfig));
                console.log('Basic Quiz config saved to localStorage:', quizConfig);

                // Immediate redirect to MCQ page with UX feedback
                setAccessStatusMessage("Starting quiz...", false, 'success');
                
                setTimeout(() => {
                    window.location.href = TARGET_MCQ_FILE;
                }, 300);
            }
        });
    } else {
        console.error("Basic Quiz setup form not found!");
        if (accessStatusMessageDiv) {
             setAccessStatusMessage("Error: Setup form is missing.", true);
        }
    }

    // --- Validation Functions ---
    function validateForm() {
        let isValid = true;
        clearErrors();

        // Validate Number of Questions (Min 10 for Basic)
        const numQuestions = parseInt(numQuestionsInput.value, 10);
        if (isNaN(numQuestions) || numQuestions < 10 || numQuestions > 100) {
            showError(numQuestionsError, 'Please enter a number between 10 and 100.', numQuestionsInput);
            isValid = false;
        }

        // Validate Time Limit
        const timeLimit = parseInt(timeLimitInput.value, 10);
        if (isNaN(timeLimit) || timeLimit < 1 || timeLimit > 180) {
            showError(timeLimitError, 'Please enter a time between 1 and 180 minutes.', timeLimitInput);
            isValid = false;
        }

        // No subject validation needed (fixed subjects)
        return isValid;
    }

    function showError(errorElement, message, inputElement = null) {
        if (!errorElement) return;
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        if (inputElement) {
            inputElement.classList.add('input-error');
        }
    }

    function clearErrors() {
        if (numQuestionsError) { numQuestionsError.textContent = ''; numQuestionsError.style.display = 'none'; }
        if (timeLimitError) { timeLimitError.textContent = ''; timeLimitError.style.display = 'none'; }
        if (numQuestionsInput) numQuestionsInput.classList.remove('input-error');
        if (timeLimitInput) timeLimitInput.classList.remove('input-error');
    }

    // --- Dynamic Error Clearing on Input ---
    if (numQuestionsInput) {
        numQuestionsInput.addEventListener('input', () => {
            if (numQuestionsInput.classList.contains('input-error')) {
                 if(numQuestionsError) { numQuestionsError.textContent = ''; numQuestionsError.style.display = 'none'; }
                 numQuestionsInput.classList.remove('input-error');
            }
        });
    }
    if (timeLimitInput) {
        timeLimitInput.addEventListener('input', () => {
            if (timeLimitInput.classList.contains('input-error')) {
                 if(timeLimitError) { timeLimitError.textContent = ''; timeLimitError.style.display = 'none'; }
                 timeLimitInput.classList.remove('input-error');
            }
        });
    }

    // --- Helper Functions for Status Messages ---
    function setAccessStatusMessage(message, isError = false, type = null) {
        if (!accessStatusMessageDiv) return;
        accessStatusMessageDiv.textContent = message;
        accessStatusMessageDiv.className = 'status-message'; // Reset classes
        if (isError) {
            accessStatusMessageDiv.classList.add('error');
        } else if (type === 'success') {
             accessStatusMessageDiv.classList.add('success');
        } else if (type === 'loading') {
            accessStatusMessageDiv.classList.add('loading');
        }
        accessStatusMessageDiv.style.display = 'block';
    }

    function clearAccessStatusMessage() {
         if (!accessStatusMessageDiv) return;
         accessStatusMessageDiv.textContent = '';
         accessStatusMessageDiv.className = 'status-message';
         accessStatusMessageDiv.style.display = 'none';
    }

    // --- Initial State ---
    clearErrors();
    clearAccessStatusMessage();
    if (startButton) {
        startButton.disabled = false;
        startButton.textContent = 'Start Basic Quiz →';
    }

}); // End DOMContentLoaded
