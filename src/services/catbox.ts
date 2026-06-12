export async function uploadToCatbox(file: File) {
  const formData = new FormData();
  const bytes = await file.arrayBuffer();
  const blob = new Blob([bytes], { type: file.type || "application/octet-stream" });

  formData.set("reqtype", "fileupload");

  if (process.env.CATBOX_USERHASH) {
    formData.set("userhash", process.env.CATBOX_USERHASH);
  }

  formData.set("fileToUpload", blob, file.name);

  const response = await fetch("https://catbox.moe/user/api.php", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Catbox upload failed");
  }

  const body = await response.text();

  if (!body.startsWith("https://")) {
    throw new Error(body || "Catbox upload returned an invalid URL");
  }

  return body.trim();
}
