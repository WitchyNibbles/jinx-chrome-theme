// Diálogo para añadir / editar / eliminar un acceso directo.

export const openEditor = ({ dialog, item = null, onSave, onDelete }) => {
  const form = dialog.querySelector("form");
  const urlInput = dialog.querySelector("#editor-url");
  const titleInput = dialog.querySelector("#editor-title");
  const errorEl = dialog.querySelector(".editor__error");
  const deleteBtn = dialog.querySelector(".editor__delete");
  const heading = dialog.querySelector("h2");

  heading.textContent = item ? "Editar acceso directo" : "Nuevo acceso directo";
  urlInput.value = item?.url ?? "";
  titleInput.value = item?.title ?? "";
  errorEl.textContent = "";
  deleteBtn.hidden = !item;

  const submit = async (event) => {
    event.preventDefault();
    try {
      await onSave({ url: urlInput.value, title: titleInput.value });
      dialog.close();
    } catch (error) {
      errorEl.textContent = error.message;
      urlInput.focus();
    }
  };
  const remove = async () => {
    try {
      await onDelete();
      dialog.close();
    } catch (error) {
      errorEl.textContent = error.message;
    }
  };

  form.addEventListener("submit", submit);
  deleteBtn.addEventListener("click", remove);
  dialog.addEventListener("close", () => {
    form.removeEventListener("submit", submit);
    deleteBtn.removeEventListener("click", remove);
  }, { once: true });

  dialog.querySelector("[data-close]").onclick = () => dialog.close();
  dialog.showModal();
  urlInput.focus();
  urlInput.select();
};
