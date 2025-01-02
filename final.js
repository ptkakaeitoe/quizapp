let categories = [
  "Country and its Cities",
  "Famous People",
  "Myanmar",
  "World Wars",
];
let currentCategory = "";
let askedQuestions = [];
let correctAnswers = 0;
let questionNumber = 1;

async function callOpenAI(prompt) {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.REACT_APP_API_KEY}`, // Use the environment variable
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: prompt },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorDetails = await response.json();
      console.error("API Error:", errorDetails);
      throw new Error(
        `API Error: ${response.status} - ${errorDetails.error.message}`
      );
    }

    const data = await response.json();
    return data.choices[0]?.message.content.trim();
  } catch (error) {
    console.error("Error calling OpenAI API:", error.message);
    return null;
  }
}

function loadCategories() {
  const categoryList = document.getElementById("categoryList");
  categoryList.innerHTML = "";
  categories.forEach((category, index) => {
    const li = document.createElement("li");
    li.innerHTML = `<button onclick="startQuiz('${category}')">${
      index + 1
    }. ${category}</button>`;
    categoryList.appendChild(li);
  });
}

function addCategory() {
  const newCategory = document.getElementById("newCategory").value.trim();
  if (newCategory && !categories.includes(newCategory)) {
    categories.push(newCategory);
    loadCategories();
    document.getElementById("newCategory").value = "";
    alert(`Category "${newCategory}" added successfully!`);
  } else {
    alert("Please enter a valid and unique category.");
  }
}

async function startQuiz(category) {
  currentCategory = category;
  askedQuestions = [];
  correctAnswers = 0;
  questionNumber = 1;

  document.getElementById("categorySection").classList.add("hidden");
  document.getElementById("quizSection").classList.remove("hidden");
  document.getElementById("quizCategory").innerText = `Quiz: ${category}`;

  await loadQuestion();
}

async function loadQuestion() {
  const feedbackBox = document.getElementById("feedbackBox");
  feedbackBox.classList.remove("hidden");

  // Prepare a string of already asked questions
  const askedQuestionsString = askedQuestions
    .map((q, index) => `(${index + 1}) ${q}`)
    .join("\n");

  const prompt = `
    Ask me one unique question about ${currentCategory} with 4 multiple-choice answers (A, B, C, D). 
    Avoid repeating any of the following questions:
    ${askedQuestionsString}

    Start the question with "No. ${questionNumber}".
  `;

  const questionResponse = await callOpenAI(prompt);

  if (!questionResponse) {
    updateFeedbackBox("Error fetching question. Please try again.", false);
    return;
  }

  // Check if the question is already in the list of asked questions
  if (askedQuestions.includes(questionResponse.trim())) {
    console.warn("Duplicate question detected. Fetching another question...");
    await loadQuestion(); // Retry loading a unique question
    return;
  }

  askedQuestions.push(questionResponse.trim()); // Save the new question
  document.getElementById("questionText").innerText = questionResponse.trim();

  const options = ["A", "B", "C", "D"];
  const answerOptions = document.getElementById("answerOptions");
  answerOptions.innerHTML = ""; // Clear previous options

  options.forEach((option) => {
    const button = document.createElement("button");
    button.innerText = option;
    button.dataset.answer = option;
    button.onclick = (event) =>
      validateAnswer(event.target.dataset.answer, questionResponse);
    answerOptions.appendChild(button);
  });
}

async function validateAnswer(selected, questionResponse) {
  const extractAnswerPrompt = `
    Extract the correct answer for the following multiple-choice question.
    Question: ${questionResponse}

    Respond with only the letter of the correct answer (A, B, C, or D), without any explanation or additional text.
  `;

  callOpenAI(extractAnswerPrompt)
    .then((extractedAnswer) => {
      if (!extractedAnswer) {
        updateFeedbackBox("Error extracting the correct answer.", false);
        return;
      }

      const correctAnswer = extractedAnswer.trim().toUpperCase();
      const sanitizedAnswer = correctAnswer.match(/^[A-D]/)?.[0];

      if (!sanitizedAnswer) {
        updateFeedbackBox(
          "Error validating the answer. Please try again.",
          false
        );
        return;
      }

      if (selected === sanitizedAnswer) {
        updateFeedbackBox("Correct!", true);
        correctAnswers++;
      } else {
        updateFeedbackBox(
          `Incorrect. The correct answer was ${sanitizedAnswer}.`,
          false
        );
      }

      updateScore();
      questionNumber++;
      setTimeout(() => {
        if (questionNumber > 20) {
          // Change here
          endQuiz();
        } else {
          loadQuestion();
        }
      }, 2000); // 2 seconds delay to show feedback
    })
    .catch((error) => {
      console.error(error);
      updateFeedbackBox("An error occurred. Please try again.", false);
    });
}

function endQuiz() {
  const feedbackBox = document.getElementById("feedbackBox");
  const feedbackMessage = document.getElementById("feedbackMessage");

  feedbackMessage.innerText = `Quiz ended! Your final score is ${correctAnswers} out of 15.`;
  feedbackMessage.style.color = "blue";

  feedbackBox.classList.remove("hidden");

  document.getElementById("quizSection").classList.add("hidden");
  document.getElementById("categorySection").classList.remove("hidden");

  correctAnswers = 0;
  questionNumber = 1;
  updateScore();
}

function updateFeedbackBox(message, isCorrect) {
  const feedbackBox = document.getElementById("feedbackBox");
  const feedbackMessage = document.getElementById("feedbackMessage");

  feedbackMessage.innerText = message;
  feedbackMessage.className = `feedback-message ${
    isCorrect ? "feedback-correct" : "feedback-incorrect"
  }`;

  feedbackBox.classList.remove("hidden");
}

function updateScore() {
  const liveScore = document.getElementById("liveScore");
  const totalQuestions = document.getElementById("totalQuestions");

  liveScore.innerText = correctAnswers;
  totalQuestions.innerText = askedQuestions.length; // Update with total answered questions
}

loadCategories();
