const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

// Optional: make line breaks inside paragraphs work like chat apps
// marked.setOptions({
//     breaks: true,
// });

function addMessage(message, className) {
    const div = document.createElement("div");

    div.classList.add("message", className);

    if (className === "bot-message") {
        // Convert Markdown -> HTML, then sanitize to prevent XSS
        const html = marked.parse(message);
        div.innerHTML = DOMPurify.sanitize(html);
    } else {
        // User text stays plain and safe
        div.textContent = message;
    }

    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function showTyping() {
    const div = document.createElement("div");

    div.classList.add("message", "bot-message");
    div.textContent = "AI is typing...";

    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;

    return div;
}

async function getBotReply(message) {
    try {
        console.log("Sending to /api/chat:", message);

        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: message,
            }),
        });

        console.log("Response status:", response.status);

        const data = await response.json();

        console.log("Response data:", data);

        if (!response.ok) {
            return data.error || "Server error occurred.";
        }

        return data.reply || "No reply received.";

    } catch (error) {
        console.error("FETCH ERROR:", error);
        return "Network error: " + error.message;
    }
}

async function sendMessage() {
    // Prevent sending while a request is already in progress
    if (sendBtn.disabled) return;

    const message = userInput.value.trim();

    if (!message) return;

    addMessage(message, "user-message");

    userInput.value = "";

    sendBtn.disabled = true;

    const typing = showTyping();

    const reply = await getBotReply(message);

    typing.remove();

    addMessage(reply, "bot-message");

    sendBtn.disabled = false;
    userInput.focus();
}

sendBtn.addEventListener("click", sendMessage);

userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        sendMessage();
    }
});