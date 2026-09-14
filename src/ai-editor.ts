import {
  AiEditResponseSchema,
  ApiErrorResponseSchema,
  type AiEditRequest,
  type SceneV1,
} from "../shared/ai-edit-contract";

type AiEditorOptions = {
  getScene: () => SceneV1;
};

const accessTokenStorageKey = "makidraw.aiAccessToken";

export function initializeAiEditor({ getScene }: AiEditorOptions) {
  const formElement = document.querySelector("#ai-edit-form");
  const promptElement = document.querySelector("#ai-edit-prompt");
  const submitElement = document.querySelector("#ai-edit-submit");
  const statusElement = document.querySelector("#ai-edit-status");
  const historyElement = document.querySelector("#prompt-history");
  const accessDialogElement = document.querySelector("#ai-access-dialog");
  const accessFormElement = document.querySelector("#ai-access-form");
  const accessTokenElement = document.querySelector("#ai-access-token");
  const accessMessageElement = document.querySelector("#ai-access-message");
  const accessCancelElement = document.querySelector("#ai-access-cancel");

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

  if (!(accessDialogElement instanceof HTMLDialogElement)) {
    throw new Error("AI access dialog was not found");
  }

  if (!(accessFormElement instanceof HTMLFormElement)) {
    throw new Error("AI access form was not found");
  }

  if (!(accessTokenElement instanceof HTMLInputElement)) {
    throw new Error("AI access token input was not found");
  }

  if (!(accessMessageElement instanceof HTMLParagraphElement)) {
    throw new Error("AI access message was not found");
  }

  if (!(accessCancelElement instanceof HTMLButtonElement)) {
    throw new Error("AI access cancel button was not found");
  }

  const form = formElement;
  const promptInput = promptElement;
  const submitButton = submitElement;
  const status = statusElement;
  const historyList = historyElement;
  const accessDialog = accessDialogElement;
  const accessForm = accessFormElement;
  const accessTokenInput = accessTokenElement;
  const accessMessage = accessMessageElement;
  const accessCancelButton = accessCancelElement;
  const promptHistory: string[] = [];

  function openAccessDialog(message: string) {
    accessMessage.textContent = message;
    accessTokenInput.value = "";

    if (!accessDialog.open) {
      accessDialog.showModal();
    }

    accessTokenInput.focus();
  }

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

  accessTokenInput.addEventListener("keydown", (event) => {
    event.stopPropagation();
  });

  accessForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const accessToken = accessTokenInput.value.trim();

    if (accessToken.length === 0) {
      accessTokenInput.focus();
      return;
    }

    sessionStorage.setItem(accessTokenStorageKey, accessToken);
    accessDialog.close();
    form.requestSubmit();
  });

  accessCancelButton.addEventListener("click", () => {
    accessDialog.close();
    status.textContent = "AI edit cancelled";
    promptInput.focus();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const prompt = promptInput.value.trim();

    if (prompt.length === 0) {
      promptInput.focus();
      return;
    }

    const accessToken = sessionStorage.getItem(accessTokenStorageKey)?.trim();

    if (!accessToken) {
      status.textContent = "Access token required";
      openAccessDialog(
        "Enter the access token for this deployment. It will be saved for this browser tab.",
      );
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody),
      });
      const responseBody: unknown = await response.json();

      if (response.status === 401) {
        sessionStorage.removeItem(accessTokenStorageKey);
        status.textContent = "Access token rejected";
        openAccessDialog("That access token was rejected. Please try again.");
        return;
      }

      if (!response.ok) {
        const result = ApiErrorResponseSchema.safeParse(responseBody);
        let message = `Request failed with status ${response.status}`

        if (result.success) {
          message = result.data.error;
        }

        throw new Error(message);
      }

      const responseResult = AiEditResponseSchema.safeParse(responseBody);
      if (!responseResult.success) {
        throw new Error("The server returned an invalid drawing scene.");
      }

      console.log(responseResult.data.scene);

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
