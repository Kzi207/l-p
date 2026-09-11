const API_URL = "https://tools.spaiauto.com/api.php";

async function getTikTok(url) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: url
      })
    });

    const data = await response.json();

    console.log("Status:", response.status);
    console.log("Response:", data);

    return data;
  } catch (error) {
    console.error("Lỗi gọi API:", error);
  }
}

getTikTok(
  "https://www.tiktok.com/@nhng.chuyn.b.n/video/7683763652754787602?is_from_webapp=1&sender_device=pc"
);