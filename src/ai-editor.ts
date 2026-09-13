import {
  isAiEditResponse,
  isApiErrorResponse,
  type AiEditRequest,
  type SceneV1,
} from "../shared/ai-edit-contract";

type AiEditorOptions = {
  getScene: () => SceneV1;
};

export function initializeAiEditor({ getScene }: AiEditorOptions) {
  const formElement = document.querySelector("#ai-edit-form");
  const promptElement = document.querySelector("#ai-edit-prompt");
  const submitElement = document.querySelector("#ai-edit-submit");
  const statusElement = document.querySelector("#ai-edit-status");
  const historyElement = document.querySelector("#prompt-history");

  if (!(formElement instanceof HTMLFormElement)) {
    throw new Error("AI edit form was not found");
  }

  if (!(promptElement instanceof HTMLTextAreaElement)) {
    throw new Error("AI prompt input was not found");
  }

  if (!(submitElement instanceof HTMLButtonElement)) {
    throw new Error("AI submit button was not found");
  }

  if (!(statusElement instanceof HTMLElement)) {
    throw new Error("AI edit status was not found");
  }

  if (!(historyElement instanceof HTMLOListElement)) {
    throw new Error("AI prompt history was not found");
  }

  const form = formElement;
  const promptInput = promptElement;
  const submitButton = submitElement;
  const status = statusElement;
  const historyList = historyElement;
  const promptHistory: string[] = [];

  function setBusy(isBusy: boolean) {
    promptInput.disabled = isBusy;
    submitButton.disabled = isBusy;
  }

  function renderHistory() {
    historyList.replaceChildren();

    if (promptHistory.length === 0) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "prompt-history-empty";
      emptyItem.textContent = "Submitted prompts will appear here.";
      historyList.append(emptyItem);
      return;
    }

    for (const prompt of promptHistory) {
      const item = document.createElement("li");
      const button = document.createElement("button");

      button.className = "prompt-history-button";
      button.type = "button";
      button.textContent = prompt;
      button.addEventListener("click", () => {
        promptInput.value = prompt;
        promptInput.focus();
      });
      item.append(button);
      historyList.append(item);
    }
  }

  promptInput.addEventListener("keydown", (event) => {
    event.stopPropagation();

    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const prompt = promptInput.value.trim();

    if (prompt.length === 0) {
      promptInput.focus();
      return;
    }

    const requestBody: AiEditRequest = {
      prompt,
      scene: getScene(),
    };

    setBusy(true);
    status.textContent = "Applying…";

    try {
      const response = await fetch("/api/drawing/aiedit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const responseBody: unknown = await response.json();

      if (!response.ok) {
        const message = isApiErrorResponse(responseBody)
          ? responseBody.error
          : `Request failed with status ${response.status}.`;
        throw new Error(message);
      }

      if (!isAiEditResponse(responseBody)) {
        throw new Error("The server returned an invalid drawing scene.");
      }

      promptHistory.unshift(prompt);
      renderHistory();
      promptInput.value = "";
      status.textContent = "Sent — no changes yet";
    } catch (error) {
      status.textContent =
        error instanceof Error ? error.message : "The request failed.";
    } finally {
      setBusy(false);
    }
  });

  renderHistory();
}
